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
├── backend/      # API Python que chama o modelo treinado
├── Detector_Vagas/ # Repositório clonado com o peso treinado e scripts originais
└── README.md
```

## 🔌 Integração com o detector real

O front-end agora pode consumir a API local em `http://127.0.0.1:8000/analyze`.

O backend em `backend/app.py` carrega o peso treinado em:

`Detector_Vagas/best_models/best/best-modelo-universal5v4.pt`

### Como executar

1. Abra um terminal na pasta do projeto.
2. Instale as dependências do backend com `py -m pip install -r backend/requirements.txt`.
3. Inicie a API com `py backend/app.py` e mantenha esse terminal aberto.
4. Em outro terminal, abra `index.html` no navegador ou use um servidor local da sua preferência.
5. Faça upload de uma imagem ou vídeo.
6. Clique em **Analisar com IA**.
7. Se quiser confirmar que o backend subiu corretamente, acesse `http://127.0.0.1:8000/health` no navegador.

Se a API não estiver ativa, a interface usa a simulação local como fallback.

### Observações práticas

- No Windows deste ambiente, o comando `python` não está disponível no PATH, mas o launcher `py` funciona.
- O backend já aponta para o peso treinado em `Detector_Vagas/best_models/best/best-modelo-universal5v4.pt`.
- O fluxo atual analisa a imagem enviada e, para vídeo, captura um frame para inferência. Se você quiser processamento do vídeo inteiro, isso precisa de uma rota extra no backend.

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
