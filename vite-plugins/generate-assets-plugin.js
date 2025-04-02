import fs from 'fs';
import path from 'path';

export default function generateAssetsPlugin(options = {}) {
  const { 
    modulesRoot = 'app/components', 
    outputDir = 'public/assets/extension-files', 
    publicURL = 'assets/extension-files',
    defaultPort = 4205
  } = options;
  
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  let serverUrl = `http://localhost:${defaultPort}`;

  function readPackageJson() {
    try {
      const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
      return JSON.parse(packageContent);
    } catch (error) {
      console.warn('⚠️ Error reading package.json:', error);
      return {};
    }
  }

  function findModule(moduleName, currentModulePath = '') {
    let normalizedModuleName = moduleName;

    if (moduleName.includes('/')) {
      const [, , ...pathParts] = moduleName.split('/');
      normalizedModuleName = pathParts.join('/');
    }

    normalizedModuleName = normalizedModuleName.replace(/\.gjs$/, '');

    const possiblePaths = [
      path.join(modulesRoot, `${normalizedModuleName}.gjs`),
      path.join(modulesRoot, normalizedModuleName, 'index.gjs')
    ];

    for (const fullPath of possiblePaths) {
      if (fs.existsSync(fullPath)) {
        return {
          fullPath,
          relativePath: path.relative(modulesRoot, fullPath)
        };
      }
    }
    
    console.warn(`⚠️ Module not found: ${moduleName} (from ${currentModulePath || 'root'})`);
    return null;
  }

  function extractLocalImports(content) {
    const importRegex = /import\s+(?:\w+\s+from\s+)?['"]([^"']+?)['"];?/g;
    const imports = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      if (match[1].startsWith('ember-app-suite/')) {
        imports.push(match[1]);
      }
    }

    return imports;
  }

  function findAllDependencies(module, foundModules = new Set()) {
    if (foundModules.has(module.fullPath)) {
      return foundModules;
    }

    foundModules.add(module.fullPath);

    const content = fs.readFileSync(module.fullPath, 'utf8');
    const localImports = extractLocalImports(content);

    localImports.forEach(importName => {
      const dependencyModule = findModule(importName, module.fullPath);
      if (dependencyModule) {
        findAllDependencies(dependencyModule, foundModules);
      }
    });

    return foundModules;
  }

  function generateBundleContent(entryModule, allModules) {
    let bundleContent = '';
    const moduleMap = new Map();

    // Primeiro, adiciona todas as importações não locais encontradas em todos os módulos
    allModules.forEach(module => {
      const content = fs.readFileSync(module.fullPath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach(line => {
        if (line.startsWith('import') && !line.includes('ember-app-suite/')) {
          bundleContent += line + '\n';
        }
      });
    });

    bundleContent += '\n';

    // Depois, adiciona o conteúdo de cada módulo como uma constante
    allModules.forEach(module => {
      const content = fs.readFileSync(module.fullPath, 'utf8');
      const moduleName = module.relativePath
        .replace(/\.gjs$/, '')
        .replace(/^(.)/, match => match.toUpperCase())  // Primeira letra maiúscula
        .replace(/\/(.)/g, (_, char) => char.toUpperCase())  // Converte letra após a barra para maiúscula
        .replace(/-./g, match => match[1].toUpperCase()); // Converte letra após hífen para maiúscula

      // Remove as importações locais e não locais
      let moduleContent = content.split('\n')
        .filter(line => !line.startsWith('import'))
        .join('\n');

      // Substitui as referências locais pelos nomes das constantes
      allModules.forEach(dep => {
        const depName = dep.relativePath
          .replace(/\.gjs$/, '')
          .replace(/^(.)/, match => match.toUpperCase())  // Primeira letra maiúscula
          .replace(/\/(.)/g, (_, char) => char.toUpperCase())  // Converte letra após a barra para maiúscula
          .replace(/-./g, match => match[1].toUpperCase()); // Converte letra após hífen para maiúscula
        
        const importPath = `ember-app-suite/components/${dep.relativePath.replace(/\.gjs$/, '')}`;
        moduleContent = moduleContent.replace(
          new RegExp(importPath, 'g'),
          depName
        );
      });

      bundleContent += `const ${moduleName} = ${moduleContent.trim()};\n\n`;
      moduleMap.set(module.fullPath, moduleName);
    });

    // Por fim, exporta o módulo de entrada como default
    const entryName = moduleMap.get(entryModule.fullPath);
    bundleContent += `export default ${entryName};\n`;

    return bundleContent;
  }

  function generateBundle() {
    const packageData = readPackageJson();
    const peekConfig = packageData['peek-extensions'] || {};
    const entryPoint = peekConfig['entry-point'];

    const entryModule = findModule(entryPoint.replace('.gjs', ''));
    if (!entryModule) {
      console.warn(`⚠️ Entry point ${entryPoint} not found`);
      return;
    }

    const allModulePaths = findAllDependencies(entryModule);
    const allModules = Array.from(allModulePaths).map(fullPath => ({
      fullPath,
      relativePath: path.relative(modulesRoot, fullPath)
    }));

    // Cria o diretório de saída se não existir
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Gera o bundle
    const bundleContent = generateBundleContent(entryModule, allModules);
    const bundlePath = path.join(outputDir, 'bundle.gjs');
    fs.writeFileSync(bundlePath, bundleContent);
    console.log(`✔ Bundle generated: ${bundlePath}`);

    // Gera o manifest
    const manifest = {
      mainDependency: {
        name: `ember-app-suite/components/${entryModule.relativePath.replace('.gjs', '')}`,
        url: `${serverUrl}/${publicURL}/bundle.gjs`,
        version: packageData.version || '0.0.0',
        type: "ember-extension"
      }
    };

    fs.writeFileSync(
      `${outputDir}/manifest.json`,
      JSON.stringify(manifest, null, 2)
    );

    console.log(`✔ Manifest generated with server URL: ${serverUrl}`);
    console.log(`📦 Components bundled:`, allModules.length);
  }

  return {
    name: 'vite-plugin-generate-assets',

    buildStart() {
      generateBundle();
    },

    configureServer(server) {
      server.httpServer?.on('listening', () => {
        const address = server.httpServer.address();
        const protocol = server.config.server.https ? 'https' : 'http';
        const host = address?.address === '::1' ? 'localhost' : address?.address;
        const port = address?.port || server.config.server.port || defaultPort;

        serverUrl = `${protocol}://${host}:${port}`;
        console.log(`📡 Server Vite running at: ${serverUrl}`);
        
        generateBundle();
      });

      server.watcher.on('change', (filePath) => {
        if (filePath.startsWith(path.resolve(modulesRoot))) {
          console.log(`🔄 File changed: ${filePath}`);
          generateBundle();
        }
      });
    },
  };
}
