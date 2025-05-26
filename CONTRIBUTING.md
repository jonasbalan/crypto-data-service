# 🤝 Guia de Contribuição

Obrigado por considerar contribuir para o Crypto Data Service! Este documento fornece diretrizes para contribuir com o projeto.

## 📋 Índice

- [Código de Conduta](#código-de-conduta)
- [Como Contribuir](#como-contribuir)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Padrões de Código](#padrões-de-código)
- [Processo de Pull Request](#processo-de-pull-request)
- [Reportando Bugs](#reportando-bugs)
- [Sugerindo Funcionalidades](#sugerindo-funcionalidades)

## 📜 Código de Conduta

Este projeto adere a um código de conduta. Ao participar, você deve manter este código. Por favor, reporte comportamentos inaceitáveis.

## 🚀 Como Contribuir

### 1. Fork do Repositório

```bash
# Clone seu fork
git clone https://github.com/SEU_USUARIO/crypt_data_service.git
cd crypt_data_service

# Adicione o repositório original como upstream
git remote add upstream https://github.com/jonasbalan/crypt_data_service.git
```

### 2. Crie uma Branch

```bash
# Crie uma branch para sua feature/fix
git checkout -b feature/nome-da-feature
# ou
git checkout -b fix/nome-do-bug
```

### 3. Faça suas Mudanças

- Siga os padrões de código estabelecidos
- Adicione testes para novas funcionalidades
- Atualize a documentação quando necessário

### 4. Teste suas Mudanças

```bash
# Execute os testes
npm test

# Verifique o linting
npm run lint

# Execute o build
npm run build
```

### 5. Commit e Push

```bash
# Commit com mensagem semântica
git commit -m "feat: adiciona nova funcionalidade X"
git push origin feature/nome-da-feature
```

### 6. Abra um Pull Request

Use o template de PR fornecido e preencha todas as seções relevantes.

## ⚙️ Configuração do Ambiente

### Pré-requisitos

- Node.js 18+
- Docker e Docker Compose
- Git

### Setup Local

1. **Clone e instale dependências:**
```bash
git clone https://github.com/jonasbalan/crypt_data_service.git
cd crypt_data_service
npm install
```

2. **Configure o ambiente:**
```bash
cp example.env .env
# Edite o .env conforme necessário
```

3. **Inicie o ambiente de desenvolvimento:**
```bash
npm run dev:mode
```

## 📝 Padrões de Código

### Commits Semânticos

Use o formato de commits semânticos:

- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Mudanças na documentação
- `style:` - Formatação, ponto e vírgula ausente, etc.
- `refactor:` - Refatoração de código
- `test:` - Adição ou correção de testes
- `chore:` - Mudanças em ferramentas, configurações, etc.

### Estilo de Código

- Use TypeScript para todo código novo
- Siga as configurações do ESLint e Prettier
- Mantenha funções pequenas e focadas
- Use nomes descritivos para variáveis e funções
- Adicione comentários para lógica complexa

### Estrutura de Arquivos

```
src/
├── controllers/     # Controladores da API
├── services/        # Lógica de negócio
├── routes/          # Definição de rotas
├── middleware/      # Middlewares
├── types/           # Tipos TypeScript
├── utils/           # Utilitários
├── tests/           # Testes
└── frontend/        # Código React
    ├── components/  # Componentes reutilizáveis
    ├── pages/       # Páginas da aplicação
    └── hooks/       # Hooks customizados
```

## 🔄 Processo de Pull Request

### Checklist do PR

- [ ] Código segue os padrões estabelecidos
- [ ] Testes passam localmente
- [ ] Documentação atualizada
- [ ] Sem warnings de linting
- [ ] Commit messages seguem padrão semântico
- [ ] PR template preenchido completamente

### Revisão

1. **Revisão Automática**: GitHub Actions executará testes e verificações
2. **Revisão Manual**: Mantenedores revisarão o código
3. **Feedback**: Implemente mudanças solicitadas
4. **Merge**: Após aprovação, o PR será mesclado

## 🐛 Reportando Bugs

Use o template de bug report e inclua:

- **Descrição clara** do problema
- **Passos para reproduzir**
- **Comportamento esperado vs atual**
- **Screenshots** (se aplicável)
- **Informações do ambiente**
- **Logs relevantes**

## 💡 Sugerindo Funcionalidades

Use o template de feature request e inclua:

- **Problema que resolve**
- **Solução proposta**
- **Alternativas consideradas**
- **Critérios de aceitação**
- **Prioridade**

## 🧪 Testes

### Executando Testes

```bash
# Todos os testes
npm test

# Testes com coverage
npm run test:coverage

# Testes em modo watch
npm run test:watch

# Testes específicos
npm test -- --testNamePattern="nome do teste"
```

### Escrevendo Testes

- Use Jest para testes unitários
- Teste casos de sucesso e erro
- Mock dependências externas
- Mantenha testes simples e focados

### Exemplo de Teste

```typescript
describe('CryptoService', () => {
  it('should fetch crypto data successfully', async () => {
    // Arrange
    const mockData = { price: 50000 };
    jest.spyOn(api, 'get').mockResolvedValue(mockData);

    // Act
    const result = await cryptoService.getPrice('BTC');

    // Assert
    expect(result).toEqual(mockData);
    expect(api.get).toHaveBeenCalledWith('/crypto/BTC');
  });
});
```

## 📚 Documentação

### Atualizando Documentação

- README.md para mudanças gerais
- Comentários JSDoc para funções
- Arquivos específicos em `/docs`
- Exemplos de uso quando aplicável

### Documentação da API

Use comentários JSDoc para documentar APIs:

```typescript
/**
 * Busca dados de preço para uma criptomoeda
 * @param symbol - Símbolo da criptomoeda (ex: 'BTC')
 * @param timeframe - Período de tempo (ex: '1h', '1d')
 * @returns Promise com dados de preço
 * @throws {Error} Quando símbolo é inválido
 */
async function getCryptoPrice(symbol: string, timeframe: string): Promise<PriceData> {
  // implementação
}
```

## 🏷️ Versionamento

O projeto segue [Semantic Versioning](https://semver.org/):

- **MAJOR**: Mudanças incompatíveis na API
- **MINOR**: Funcionalidades compatíveis
- **PATCH**: Correções de bugs compatíveis

## 🆘 Precisa de Ajuda?

- 📧 **Email**: seu-email@exemplo.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/jonasbalan/crypt_data_service/issues)
- 💬 **Discussões**: [GitHub Discussions](https://github.com/jonasbalan/crypt_data_service/discussions)

## 🙏 Reconhecimento

Todos os contribuidores serão reconhecidos no README.md e releases.

---

**Obrigado por contribuir! 🚀** 