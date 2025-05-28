const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando Crypto Data Service (Modo Sem Docker)');
console.log('================================================');

// Verificar se o arquivo .env existe, se não, copiar do dev.env
const envPath = path.join(__dirname, '.env');
const devEnvPath = path.join(__dirname, 'dev.env');

if (!fs.existsSync(envPath) && fs.existsSync(devEnvPath)) {
  console.log('📋 Copiando configurações de desenvolvimento...');
  fs.copyFileSync(devEnvPath, envPath);
  console.log('✅ Arquivo .env criado');
}

// Configurações para modo sem Docker
const envConfig = `
# Configurações para modo sem Docker
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
API_KEY=dev-api-key

# Desabilitar serviços que precisam de Docker
SKIP_DATABASE_CONNECTION=true
SKIP_MILVUS_CONNECTION=true
SKIP_REDIS_CONNECTION=true
SKIP_OLLAMA_CONNECTION=true
SKIP_WEBSOCKET_CONNECTION=true

# Rate limiting (desabilitado para modo sem Docker)
SKIP_RATE_LIMITING=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=10000

# Usar apenas APIs externas
USE_REAL_DATA_ONLY=true
COINGECKO_API_URL=https://api.coingecko.com/api/v3
COINGECKO_API_KEY=
NEWS_API_KEY=

# Frontend
WEBPACK_DEV_SERVER=true
HOT_RELOAD=true

# Configurações opcionais (não usadas em modo sem Docker)
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://localhost:27017/crypto-data
VECTOR_DB_HOST=localhost
VECTOR_DB_PORT=19530
`;

// Atualizar .env para modo sem Docker
console.log('⚙️ Configurando modo sem Docker...');
fs.writeFileSync(envPath, envConfig);
console.log('✅ Configurações atualizadas');

// Função para executar comando
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`🔧 Executando: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Comando falhou com código ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Função principal
async function start() {
  try {
    console.log('📦 Instalando dependências...');
    await runCommand('npm', ['install']);
    console.log('✅ Dependências instaladas');

    console.log('🔨 Compilando backend...');
    await runCommand('npm', ['run', 'build:backend']);
    console.log('✅ Backend compilado');

    console.log('🎨 Compilando frontend...');
    await runCommand('npm', ['run', 'build:frontend']);
    console.log('✅ Frontend compilado');

    console.log('🌐 Iniciando servidor...');
    console.log('');
    console.log('📍 URLs disponíveis:');
    console.log('   Frontend: http://localhost:3000');
    console.log('   API: http://localhost:3000/api');
    console.log('   Health: http://localhost:3000/health');
    console.log('   Swagger: http://localhost:3000/api-docs');
    console.log('');
    console.log('💡 Pressione Ctrl+C para parar o servidor');
    console.log('');

    // Iniciar servidor em modo desenvolvimento
    await runCommand('npm', ['run', 'dev:start']);

  } catch (error) {
    console.error('❌ Erro ao iniciar:', error.message);
    console.log('');
    console.log('🔧 Tentativas de solução:');
    console.log('1. Verifique se o Node.js está instalado (versão 18+)');
    console.log('2. Execute: npm install');
    console.log('3. Verifique se a porta 3000 está livre');
    console.log('4. Tente executar: npm run dev');
    process.exit(1);
  }
}

// Interceptar Ctrl+C para limpeza
process.on('SIGINT', () => {
  console.log('\n🛑 Parando servidor...');
  process.exit(0);
});

// Iniciar
start(); 