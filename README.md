# ParkVision AI 🚗

Interface visual para monitoramento inteligente de estacionamento via **Inteligência Artificial**.

O sistema detecta vagas **livres** e **ocupadas** através da análise de **imagens e vídeos**, usando modelos de visão computacional como YOLOv8.

---

## 🖥️ Interface

A interface foi construída com HTML, CSS e JavaScript puro, sem dependências externas além das Google Fonts. Possui:

- **Dashboard** com KPIs em tempo real (vagas livres, ocupadas, confiança da IA)
- **Análise de Mídia** — upload de imagens e vídeos com detecção simulada e bounding boxes
- **Mapa do Estacionamento** — visualização por setores
- **Histórico** — log de análises realizadas com gráfico de ocupação
- **Configurações** — limiar de confiança, intervalo de re-análise e tipos de arquivo aceitos

---

## 📁 Estrutura

```
Ia_Estacionamento/
├── index.html   # Estrutura da interface
├── style.css    # Design system (dark mode, glassmorphism)
├── app.js       # Lógica da aplicação e simulação de IA
└── README.md
```

---

## 🚀 Como usar

1. Abra o arquivo `index.html` no navegador
2. Vá para a aba **Análise de Mídia**
3. Faça upload de uma imagem ou vídeo do estacionamento
4. Clique em **Analisar com IA**
5. Visualize as vagas detectadas com os bounding boxes

> Para integrar com o modelo real (ex: YOLOv8 via Python/Flask), substitua a função `buildDetectionResult()` no `app.js` pela chamada à sua API de detecção.

---

## 🤖 Tecnologias

- **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (ES6+)
- **IA (planejado):** YOLOv8, Python, OpenCV
- **Fontes:** Inter + JetBrains Mono (Google Fonts)

---

## 👤 Autor

**SIgorSs** — [github.com/SIgorSs](https://github.com/SIgorSs)
