const path = require("path");

module.exports = {
  // Define o diretório raiz do projeto para o Vite
  root: path.resolve(process.cwd(), "frontend"),
  server: {
    // Configurações do servidor de desenvolvimento do Vite
    // Se precisar de proxy para a API, pode ser configurado aqui
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:3000', // URL do seu backend
    //     changeOrigin: true,
    //     secure: false,
    //     rewrite: (path) => path.replace(/^\/api/, '')
    //   }
    // }
  },
  build: {
    // Configurações de build para produção
    outDir: "dist", // Diretório de saída para os arquivos compilados
    emptyOutDir: true, // Limpa o diretório de saída antes de compilar
    rollupOptions: {
      // Opções adicionais para o Rollup
      input: {
        main: path.resolve(__dirname, "frontend/index.html"), // Ponto de entrada principal do frontend
      },
      output: {
        // Configurações de saída do Rollup
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // Divide o código em chunks menores para otimização
            return "vendor";
          }
        },
      },
    },
  },
  plugins: [
    // Plugins do Vite
    // Se usar React, Vue, etc., os plugins apropriados seriam adicionados aqui
    // Exemplo: viteReact(), viteVue()
  ],
  resolve: {
    // Alias para caminhos comuns
    alias: {
      "@": path.resolve(__dirname, "frontend/src"),
    },
  },
  css: {
    // Configurações de CSS
    preprocessorOptions: {
      scss: {
        // Opções para pré-processadores SCSS
        // additionalData: `@import "@/styles/_variables.scss";`
      },
    },
  },
};