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

    // Extrai o caminho após o nome do pacote (ex: ember-app-suite/components/form/button.gjs -> components/form/button.gjs)
    if (moduleName.includes('/')) {
      const [, , ...pathParts] = moduleName.split('/');
      normalizedModuleName = pathParts.join('/');
    }

    // Remove a extensão .gjs se existir
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
      // Apenas considera importações que começam com o nome do pacote
      if (match[1].startsWith('ember-app-suite/')) {
        imports.push(match[1]);
      }
    }

    return imports;
  }

  function findAllDependencies(module, foundModules = new Set()) {
    // Se o módulo já foi processado, retorna para evitar loops infinitos
    if (foundModules.has(module.fullPath)) {
      return foundModules;
    }

    // Adiciona o módulo atual ao conjunto
    foundModules.add(module.fullPath);

    // Lê o conteúdo do módulo
    const content = fs.readFileSync(module.fullPath, 'utf8');
    const localImports = extractLocalImports(content);

    // Processa recursivamente cada importação
    localImports.forEach(importName => {
      const dependencyModule = findModule(importName, module.fullPath);
      if (dependencyModule) {
        findAllDependencies(dependencyModule, foundModules);
      }
    });

    return foundModules;
  }

  function createModuleInfo(module) {
    const packageData = readPackageJson();
    const moduleName = module.relativePath.replace('.gjs', '');
    
    return {
      name: `ember-app-suite/components/${moduleName}`,
      url: `${serverUrl}/${publicURL}/${module.relativePath}`,
      version: packageData.version || '0.0.0',
      type: "ember-extension"
    };
  }

  function generateFiles(modules) {
    modules.forEach((module) => {
      const modulePath = path.dirname(module.relativePath);
      const moduleOutputDir = path.join(outputDir, modulePath);
      const moduleContent = fs.readFileSync(module.fullPath);
      
      if (!moduleContent.toString) {
        console.warn(`⚠️ Couldn't read ${module.relativePath} content.`);
        return;
      }

      if (!fs.existsSync(moduleOutputDir)) {
        fs.mkdirSync(moduleOutputDir, { recursive: true });
      }

      const filePath = path.join(outputDir, module.relativePath);
      const content = moduleContent.toString();
      
      fs.writeFileSync(filePath, content);
      console.log(`✔ File generated: ${filePath}`);
    });
  }

  function generateManifest() {
    const packageData = readPackageJson();
    const peekConfig = packageData['peek-extensions'] || {};
    const entryPoint = peekConfig['entry-point'];

    // Encontra o módulo de entrada
    const entryModule = findModule(entryPoint.replace('.gjs', ''));
    if (!entryModule) {
      console.warn(`⚠️ Entry point ${entryPoint} not found`);
      return;
    }

    // Encontra todas as dependências recursivamente
    const allModulePaths = findAllDependencies(entryModule);
    
    // Converte os caminhos completos em módulos
    const allModules = Array.from(allModulePaths).map(fullPath => ({
      fullPath,
      relativePath: path.relative(modulesRoot, fullPath)
    }));

    // Gera os arquivos
    generateFiles(allModules);

    // Gera o manifest
    const manifest = {
      dependencies: [],
      mainDependency: createModuleInfo(entryModule)
    };

    // Adiciona as dependências (excluindo o módulo de entrada)
    allModules.forEach(module => {
      if (module.fullPath !== entryModule.fullPath) {
        manifest.dependencies.unshift(createModuleInfo(module));
      }
    });

    fs.writeFileSync(
      `${outputDir}/manifest.json`, 
      JSON.stringify(manifest, null, 2)
    );

    console.log(`✔ Manifest generated with server URL: ${serverUrl}`);
    console.log(`📦 Dependencies found:`, allModules.length - 1);
  }

  return {
    name: 'vite-plugin-generate-assets',

    buildStart() {
      generateManifest();
    },

    configureServer(server) {
      server.httpServer?.on('listening', () => {
        const address = server.httpServer.address();
        const protocol = server.config.server.https ? 'https' : 'http';
        const host = address?.address === '::1' ? 'localhost' : address?.address;
        const port = address?.port || server.config.server.port || defaultPort;

        serverUrl = `${protocol}://${host}:${port}`;
        console.log(`📡 Server Vite running at: ${serverUrl}`);
        
        generateManifest();
      });

      server.watcher.on('change', (filePath) => {
        if (filePath.startsWith(path.resolve(modulesRoot))) {
          console.log(`🔄 File changed: ${filePath}`);
          generateManifest();
        }
      });
    },
  };
}
