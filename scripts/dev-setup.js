#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Cores para console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkDocker() {
  try {
    execSync('docker version', { stdio: 'ignore' });
    log('✅ Docker está rodando', 'green');
    return true;
  } catch (error) {
    log('❌ Docker não está rodando. Inicie o Docker Desktop primeiro.', 'red');
    return false;
  }
}

function checkServices() {
  try {
    const output = execSync('docker ps --format "table {{.Names}}"', { encoding: 'utf8' });
    const services = ['milvus', 'redis', 'ollama', 'etcd', 'minio'];
    const runningServices = services.filter(service => 
      output.includes(service)
    );
    
    if (runningServices.length === services.length) {
      log('✅ Todos os serviços estão rodando', 'green');
      return true;
    } else {
      log(`⚠️  Apenas ${runningServices.length}/${services.length} serviços estão rodando`, 'yellow');
      return false;
    }
  } catch (error) {
    log('❌ Erro ao verificar serviços', 'red');
    return false;
  }
}

function startServices() {
  log('🚀 Iniciando serviços Docker...', 'blue');
  try {
    execSync('docker-compose -f docker-compose.services.yml up -d', { 
      stdio: 'inherit' 
    });
    log('✅ Serviços Docker iniciados', 'green');
    return true;
  } catch (error) {
    log('❌ Erro ao iniciar serviços Docker', 'red');
    return false;
  }
}

function copyDevConfig() {
  const devEnvPath = path.join(process.cwd(), 'dev.env');
  const envPath = path.join(process.cwd(), '.env');
  
  if (fs.existsSync(devEnvPath)) {
    fs.copyFileSync(devEnvPath, envPath);
    log('✅ Configurações de desenvolvimento copiadas para .env', 'green');
  } else {
    log('⚠️  Arquivo dev.env não encontrado', 'yellow');
  }
}

async function waitForServices(seconds = 20) {
  log(`⏳ Aguardando ${seconds} segundos para os serviços estabilizarem...`, 'yellow');
  
  return new Promise((resolve) => {
    let countdown = seconds;
    const interval = setInterval(() => {
      process.stdout.write(`\r⏳ ${countdown}s restantes...`);
      countdown--;
      
      if (countdown < 0) {
        clearInterval(interval);
        process.stdout.write('\r✅ Tempo de espera concluído!\n');
        resolve();
      }
    }, 1000);
  });
}

async function downloadOllamaModel() {
  log('📥 Tentando baixar modelo llama3 do Ollama...', 'blue');
  try {
    // Verificar se Ollama está respondendo primeiro
    execSync('curl -s http://localhost:11434/api/version', { stdio: 'ignore' });
    
    // Baixar modelo em background
    spawn('curl', [
      '-X', 'POST', 
      'http://localhost:11434/api/pull',
      '-H', 'Content-Type: application/json',
      '-d', '{"name":"llama3"}'
    ], { 
      detached: true,
      stdio: 'ignore'
    });
    
    log('✅ Download do modelo iniciado em background', 'green');
  } catch (error) {
    log('⚠️  Ollama não está respondendo ainda. Modelo será baixado depois.', 'yellow');
  }
}

function testServices() {
  log('🧪 Testando conectividade dos serviços...', 'blue');
  
  const tests = [
    {
      name: 'Ollama',
      command: 'curl -s http://localhost:11434/api/version',
      successMsg: '✅ Ollama está respondendo'
    },
    {
      name: 'Milvus',
      command: 'curl -s http://localhost:9091/healthz',
      successMsg: '✅ Milvus está saudável'
    },
    {
      name: 'Redis',
      command: 'docker exec crypto-data-service_redis_1 redis-cli ping 2>/dev/null',
      successMsg: '✅ Redis está respondendo'
    }
  ];
  
  tests.forEach(test => {
    try {
      execSync(test.command, { stdio: 'ignore' });
      log(test.successMsg, 'green');
    } catch (error) {
      log(`⚠️  ${test.name} não está respondendo ainda`, 'yellow');
    }
  });
}

async function main() {
  log('🎯 Configurando ambiente de desenvolvimento...', 'cyan');
  log('', 'reset');
  
  // Verificar Docker
  if (!checkDocker()) {
    process.exit(1);
  }
  
  // Verificar se serviços já estão rodando
  if (!checkServices()) {
    // Iniciar serviços se não estiverem rodando
    if (!startServices()) {
      process.exit(1);
    }
    
    // Aguardar serviços estabilizarem
    await waitForServices(20);
  }
  
  // Copiar configurações de desenvolvimento
  copyDevConfig();
  
  // Testar serviços
  testServices();
  
  // Baixar modelo Ollama
  await downloadOllamaModel();
  
  log('', 'reset');
  log('🎉 Setup de desenvolvimento concluído!', 'green');
  log('💡 Os serviços estão rodando em:', 'cyan');
  log('   🔹 Milvus: http://localhost:19530', 'blue');
  log('   🔹 Redis: localhost:6379', 'blue');
  log('   🔹 Ollama: http://localhost:11434', 'blue');
  log('   🔹 Milvus UI: http://localhost:9091', 'blue');
  log('   🔹 MinIO: http://localhost:9001', 'blue');
  log('', 'reset');
  log('🚀 Iniciando backend e frontend...', 'magenta');
  log('', 'reset');
}

if (require.main === module) {
  main().catch(error => {
    log(`❌ Erro: ${error.message}`, 'red');
    process.exit(1);
  });
} 