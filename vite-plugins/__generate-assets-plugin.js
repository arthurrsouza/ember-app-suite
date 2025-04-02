import fs from 'fs';
import path from 'path';

function capitalize (string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export default function generateAssetsPlugin(options = {}) {
  const { 
    modulesRoot = 'app/components', 
    outputDir = 'public/assets/extension-files', 
    publicURL = 'assets/extension-files',
    defaultPort = 4205 // Adicionando porta padrão
  } = options;
  
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  let serverUrl = `http://localhost:${defaultPort}`; // URL padrão inicial

  function readPackageJson() {
    try {
      const packageContent = fs.readFileSync(packageJsonPath, 'utf8');
      return JSON.parse(packageContent);
    } catch (error) {
      console.warn('⚠️ Error reading package.json:', error);
      return {};
    }
  }

  function getAllModules(dir, baseDir = dir) {
    let modules = [];
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const fullPath = path.join(dir, file);
      const relativePath = path.relative(baseDir, fullPath);
      
      if (fs.statSync(fullPath).isDirectory()) {
        modules = modules.concat(getAllModules(fullPath, baseDir));
      } else if (file.endsWith('.gjs')) {
        modules.push({fullPath, relativePath});
      }
    });

    return modules;
  }

  function generateFiles() {
    if (!fs.existsSync(modulesRoot)) {
      console.warn(`⚠️ The folder ${modulesRoot} does not exists.`);
      return;
    }

    const modules = getAllModules(modulesRoot);

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

    generateManifest(modules);
  }

  function createModuleInfo(module) {
    const packageData = readPackageJson();

    return {
      name: `./${capitalize(module.relativePath.replace('.gjs', ''))}`,
      url: `${serverUrl}/${publicURL}/${module.relativePath}`,
      version: packageData.version || '0.0.0',
      type: "ember-extension"
    };
  }

  function generateManifest(modules) {
    const packageData = readPackageJson();
    const peekConfig = packageData['peek-extensions'] || {};
    const entryPoint = peekConfig['entry-point'];

    const manifest = {
      dependencies: []
    };

    modules.forEach((module) => {
      const moduleInfo = createModuleInfo(module);

      if (module.relativePath === entryPoint) {
        Object.assign(manifest, { mainDependency: moduleInfo });
      } else {
        manifest.dependencies.push(moduleInfo);
      }
    });

    fs.writeFileSync(
      `${outputDir}/manifest.json`, 
      JSON.stringify(manifest, null, 2)
    );

    console.log(`✔ Manifest generated with server URL: ${serverUrl}`);
  }

  return {
    name: 'vite-plugin-generate-assets',

    buildStart() {
      generateFiles();
    },

    configureServer(server) {
      // Atualiza a URL do servidor quando ele iniciar
      server.httpServer?.on('listening', () => {
        const address = server.httpServer.address();
        const protocol = server.config.server.https ? 'https' : 'http';
        const host = address?.address === '::1' ? 'localhost' : address?.address;
        const port = address?.port || server.config.server.port || defaultPort;

        serverUrl = `${protocol}://${host}:${port}`;
        console.log(`📡 Server Vite running at: ${serverUrl}`);
        
        // Regenera os arquivos com a nova URL
        generateFiles();
      });

      server.watcher.on('change', (filePath) => {
        if (filePath.startsWith(path.resolve(modulesRoot))) {
          console.log(`🔄 File changed: ${filePath}`);
          generateFiles();
        }
      });
    },
  };
}
