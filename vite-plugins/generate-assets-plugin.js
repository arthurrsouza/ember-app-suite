import fs from 'fs';
import path from 'path';
import { minify } from 'terser';

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

  async function generateBundleContent(entryModule, allModules) {
    let bundleContent = '';
    const moduleMap = new Map();
    const uniqueImports = new Set();
    const preservedStrings = new Map();

    // First, collect all non-local imports from all modules
    allModules.forEach(module => {
      const content = fs.readFileSync(module.fullPath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach(line => {
        if (line.startsWith('import') && !line.includes('ember-app-suite/')) {
          uniqueImports.add(line);
        }
      });
    });

    // Add unique imports at the beginning of the bundle
    bundleContent += Array.from(uniqueImports).join('\n');
    bundleContent += '\n\n';

    // Then, add the content of each module as a constant
    allModules.forEach(module => {
      const content = fs.readFileSync(module.fullPath, 'utf8');
      const moduleName = module.relativePath
        .replace(/\.gjs$/, '')
        .replace(/^(.)/, match => match.toUpperCase())
        .replace(/\/(.)/g, (_, char) => char.toUpperCase())
        .replace(/-./g, match => match[1].toUpperCase());

      // Split content into lines
      let moduleContent = content.split('\n');
      
      // Find the index of export default
      const exportIndex = moduleContent.findIndex(line => line.startsWith('export default'));
      
      // Get all lines before export default that are not imports
      const preExportContent = moduleContent
        .slice(0, exportIndex)
        .filter(line => !line.startsWith('import'))
        .join('\n');
      
      // Get the class content (export default and after)
      const classContent = moduleContent
        .slice(exportIndex)
        .join('\n')
        .replace(/export\s+default\s+class\s+(\w+)/, 'class $1')
        .trim();

      // First add the pre-export content
      if (preExportContent.trim()) {
        bundleContent += preExportContent + '\n\n';
      }

      // Replace local references with constant names
      let processedClassContent = classContent;
      allModules.forEach(dep => {
        const depName = dep.relativePath
          .replace(/\.gjs$/, '')
          .replace(/^(.)/, match => match.toUpperCase())
          .replace(/\/(.)/g, (_, char) => char.toUpperCase())
          .replace(/-./g, match => match[1].toUpperCase());
        
        const importPath = `ember-app-suite/components/${dep.relativePath.replace(/\.gjs$/, '')}`;
        processedClassContent = processedClassContent.replace(
          new RegExp(importPath, 'g'),
          depName
        );
      });

      bundleContent += `const ${moduleName} = ${processedClassContent};\n\n`;
      moduleMap.set(module.fullPath, moduleName);
    });

    // Finally, export the entry module as default
    const entryName = moduleMap.get(entryModule.fullPath);
    bundleContent += `export default ${entryName};\n`;

    // Basic minification
    bundleContent = bundleContent
      // Remove comments
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
      // Remove empty lines
      .replace(/^\s*[\r\n]/gm, '')
      // Preserve handlebars, template literals, and decorators before general space removal
      .replace(/(\{\{.*?\}\}|`[\s\S]*?`|@\w+)/g, (match) => {
        // Generate a unique placeholder
        const placeholder = `__PRESERVED_${Math.random().toString(36).substr(2, 9)}__`;
        // Store the mapping
        preservedStrings.set(placeholder, match);
        return placeholder;
      })
      // Remove extra spaces
      .replace(/\s+/g, ' ')
      // Remove spaces around operators (except in preserved strings)
      .replace(/\s*([=+\-*/<>!])\s*/g, '$1')
      // Remove spaces after commas
      .replace(/,\s+/g, ',')
      // Remove spaces around brackets and parentheses
      .replace(/\s*([\[\](){}])\s*/g, '$1')
      // Restore preserved strings
      .replace(/__PRESERVED_[a-z0-9]+__/g, (match) => {
        return preservedStrings.get(match) || match;
      })
      // Trim the final result
      .trim();

    return bundleContent;
  }

  async function generateBundle() {
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

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate the bundle
    const bundleContent = await generateBundleContent(entryModule, allModules);
    const bundlePath = path.join(outputDir, 'bundle.gjs');
    fs.writeFileSync(bundlePath, bundleContent);
    console.log(`✔ Bundle generated and minified: ${bundlePath}`);

    // Generate the manifest
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
