// 1. Initialisation du titre H1
var h1 = document.createElement('h1');

// 2. État du jeu
let correctCount = 0;
let totalCount = 0;
let currentQuestion = null;
let currentMode = 'affirmation'; // 'affirmation', 'calcul', ou 'pgcd'
let currentDifficulty = 'facile'; // 'facile', 'moyen', 'difficile'

// Injection des styles globaux
const globalStyles = document.createElement('style');
globalStyles.textContent = `
  body {
    margin: 0;
    padding: 16px;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #f9fafb;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  
  .game-container {
    width: 100%;
    max-width: 460px;
    padding: 24px;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    background-color: #ffffff;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);
    text-align: center;
    box-sizing: border-box;
  }

  @media (max-width: 480px) {
    .game-container {
      padding: 18px 14px;
      border-radius: 12px;
    }
    .game-h1 {
      font-size: 18px !important;
    }
    .mode-btn, .diff-btn {
      padding: 6px 8px !important;
      font-size: 11px !important;
    }
    .action-btn {
      padding: 12px 16px !important;
    }
  }
`;
document.head.appendChild(globalStyles);

// Helper pour styliser les boutons
const styleBtn = (btn, category = 'action') => {
  btn.classList.add(`${category}-btn`);
  btn.style.padding = '8px 12px';
  btn.style.cursor = 'pointer';
  btn.style.borderRadius = '8px';
  btn.style.border = '1px solid #d1d5db';
  btn.style.backgroundColor = '#ffffff';
  btn.style.color = '#374151';
  btn.style.fontWeight = '500';
  btn.style.fontSize = '13px';
  btn.style.transition = 'all 0.15s ease-in-out';
  btn.style.outline = 'none';
  btn.style.webkitTapHighlightColor = 'transparent';
};

// 3. Création du conteneur principal
const container = document.createElement('div');
container.classList.add('game-container');

// Style du titre H1
h1.classList.add('game-h1');
h1.style.fontSize = '20px';
h1.style.color = '#111827';
h1.style.margin = '16px 0';
h1.style.fontWeight = '600';
h1.style.lineHeight = '1.4';

// 4. Sélecteur de mode (Vrai/Faux vs Calcul vs PGCD)
const modeSelector = document.createElement('div');
modeSelector.style.marginBottom = '12px';
modeSelector.style.display = 'flex';
modeSelector.style.gap = '6px';
modeSelector.style.justifyContent = 'center';

const btnMode1 = document.createElement('button');
btnMode1.textContent = 'Vrai / Faux';
styleBtn(btnMode1, 'mode');

const btnMode2 = document.createElement('button');
btnMode2.textContent = 'Calcul (a^k)';
styleBtn(btnMode2, 'mode');

const btnMode3 = document.createElement('button');
btnMode3.textContent = 'PGCD';
styleBtn(btnMode3, 'mode');

modeSelector.appendChild(btnMode1);
modeSelector.appendChild(btnMode2);
modeSelector.appendChild(btnMode3);

// 4b. Sélecteur de difficulté (Facile / Moyen / Difficile)
const diffSelector = document.createElement('div');
diffSelector.style.marginBottom = '20px';
diffSelector.style.display = 'flex';
diffSelector.style.gap = '6px';
diffSelector.style.justifyContent = 'center';

const diffs = [
  { id: 'facile', label: 'Facile' },
  { id: 'moyen', label: 'Moyen' },
  { id: 'difficile', label: 'Difficile' }
];

const diffButtons = {};

diffs.forEach(d => {
  const btn = document.createElement('button');
  btn.textContent = d.label;
  styleBtn(btn, 'diff');
  btn.addEventListener('click', () => switchDifficulty(d.id));
  diffButtons[d.id] = btn;
  diffSelector.appendChild(btn);
});

// 5. Affichage du score
const score = document.createElement('p');
score.style.fontSize = '13px';
score.style.color = '#6b7280';
score.style.margin = '0 0 16px 0';
score.style.fontWeight = '500';

// 6. Zone Mode 1 (Vrai / Faux)
const mode1Box = document.createElement('div');
mode1Box.style.display = 'flex';
mode1Box.style.justifyContent = 'center';
mode1Box.style.gap = '10px';

const btnYes = document.createElement('button');
btnYes.textContent = 'Oui';
styleBtn(btnYes, 'action');
btnYes.style.flex = '1';
btnYes.style.borderColor = '#bbf7d0';
btnYes.style.backgroundColor = '#f0fdf4';
btnYes.style.color = '#166534';

const btnNo = document.createElement('button');
btnNo.textContent = 'Non';
styleBtn(btnNo, 'action');
btnNo.style.flex = '1';
btnNo.style.borderColor = '#fecaca';
btnNo.style.backgroundColor = '#fef2f2';
btnNo.style.color = '#991b1b';

mode1Box.appendChild(btnYes);
mode1Box.appendChild(btnNo);

// 7. Zone des Modes Saisie (Calcul & PGCD)
const inputBox = document.createElement('div');
inputBox.style.display = 'none';
inputBox.style.gap = '8px';
inputBox.style.justifyContent = 'center';
inputBox.style.width = '100%';

const input = document.createElement('input');
input.type = 'number';
input.placeholder = 'Réponse...';
input.style.padding = '10px 12px';
input.style.borderRadius = '8px';
input.style.border = '1px solid #d1d5db';
input.style.fontSize = '14px';
input.style.outline = 'none';
input.style.flex = '1';
input.style.maxWidth = '140px';
input.style.textAlign = 'center';

input.addEventListener('focus', () => {
  input.style.borderColor = '#4f46e5';
});
input.addEventListener('blur', () => {
  input.style.borderColor = '#d1d5db';
});

const btnSubmit = document.createElement('button');
btnSubmit.textContent = 'Valider';
styleBtn(btnSubmit, 'action');
btnSubmit.style.backgroundColor = '#4f46e5';
btnSubmit.style.color = '#ffffff';
btnSubmit.style.borderColor = '#4f46e5';

inputBox.appendChild(input);
inputBox.appendChild(btnSubmit);

// 8. Zone des retours d'information
const feedback = document.createElement('div');
feedback.style.marginTop = '20px';
feedback.style.padding = '10px 14px';
feedback.style.borderRadius = '8px';
feedback.style.fontSize = '13px';
feedback.style.lineHeight = '1.4';
feedback.style.display = 'none';

// 9. Assemblage du DOM
container.appendChild(modeSelector);
container.appendChild(diffSelector);
container.appendChild(h1);
container.appendChild(score);
container.appendChild(mode1Box);
container.appendChild(inputBox);
container.appendChild(feedback);
document.body.appendChild(container);

// Helpers mathématiques
function powerMod(base, exp, mod) {
  let res = 1;
  base = base % mod;
  while (exp > 0) {
    if (exp % 2 === 1) res = (res * base) % mod;
    exp = Math.floor(exp / 2);
    base = (base * base) % mod;
  }
  return res;
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

// 10. Générateur de questions adaptatif
function generateQuestion() {
  feedback.style.display = 'none';
  feedback.textContent = '';
  score.textContent = `Score : ${correctCount} / ${totalCount}`;

  if (currentMode === 'affirmation') {
    let n, maxA;
    if (currentDifficulty === 'facile') {
      n = Math.floor(Math.random() * 5) + 2;
      maxA = 50;
    } else if (currentDifficulty === 'moyen') {
      n = Math.floor(Math.random() * 10) + 5;
      maxA = 200;
    } else {
      n = Math.floor(Math.random() * 40) + 10;
      maxA = 4000;
    }

    const a = Math.floor(Math.random() * maxA);
    const isTrue = Math.random() < 0.5;
    let b;

    if (isTrue) {
      const k = Math.floor(Math.random() * 7) - 3;
      b = a + k * n;
    } else {
      b = Math.floor(Math.random() * maxA);
      if ((a - b) % n === 0) b += 1;
    }

    currentQuestion = { a, b, n, isTrue };
    h1.textContent = `Est-ce que ${a} ≡ ${b} [${n}] ?`;
    btnYes.disabled = false;
    btnNo.disabled = false;
    btnYes.style.opacity = '1';
    btnNo.style.opacity = '1';

  } else if (currentMode === 'calcul') {
    let n, maxA, maxK;
    if (currentDifficulty === 'facile') {
      n = Math.floor(Math.random() * 6) + 3;
      maxA = 6;
      maxK = 3;
    } else if (currentDifficulty === 'moyen') {
      n = Math.floor(Math.random() * 10) + 5;
      maxA = 15;
      maxK = 5;
    } else {
      n = Math.floor(Math.random() * 40) + 7;
      maxA = 1000;
      maxK = 30;
    }

    const a = Math.floor(Math.random() * maxA) + 2;
    const k = Math.floor(Math.random() * maxK) + 2;
    const expectedC = powerMod(a, k, n);

    currentQuestion = { a, k, n, expectedC };
    h1.textContent = `Trouver C ≡ ${a}^${k} [${n}]`;
    input.placeholder = 'Reste C...';
    input.value = '';
    input.disabled = false;
    btnSubmit.disabled = false;
    btnSubmit.style.opacity = '1';
    input.focus();

  } else if (currentMode === 'pgcd') {
    let min, max;
    if (currentDifficulty === 'facile') {
      min = 12; max = 75;
    } else if (currentDifficulty === 'moyen') {
      min = 40; max = 250;
    } else {
      min = 100; max = 1200;
    }

    const a = Math.floor(Math.random() * (max - min)) + min;
    const b = Math.floor(Math.random() * (max - min)) + min;
    const expectedPGCD = gcd(a, b);

    currentQuestion = { a, b, expectedPGCD };
    h1.textContent = `PGCD(${a}, ${b}) = ?`;
    input.placeholder = 'PGCD...';
    input.value = '';
    input.disabled = false;
    btnSubmit.disabled = false;
    btnSubmit.style.opacity = '1';
    input.focus();
  }
}

// Helper pour afficher le message de retour
function showFeedback(text, isSuccess) {
  feedback.textContent = text;
  feedback.style.display = 'block';
  if (isSuccess) {
    feedback.style.backgroundColor = '#f0fdf4';
    feedback.style.color = '#15803d';
    feedback.style.border = '1px solid #bbf7d0';
  } else {
    feedback.style.backgroundColor = '#fef2f2';
    feedback.style.color = '#b91c1c';
    feedback.style.border = '1px solid #fecaca';
  }
}

// 11. Logique de validation Mode 1
function checkAnswerMode1(userAnswer) {
  if (currentQuestion.isTrue === undefined) return;
  totalCount++;
  btnYes.disabled = true;
  btnNo.disabled = true;
  btnYes.style.opacity = '0.6';
  btnNo.style.opacity = '0.6';

  if (userAnswer === currentQuestion.isTrue) {
    correctCount++;
    showFeedback('Correct !', true);
  } else {
    const diff = currentQuestion.a - currentQuestion.b;
    showFeedback(`Faux ! (${currentQuestion.a} - ${currentQuestion.b} = ${diff}, qui ${diff % currentQuestion.n === 0 ? 'est' : "n'est pas"} divisible par ${currentQuestion.n})`, false);
  }

  setTimeout(generateQuestion, 400);
}

// 12. Logique de validation Modes Saisie (Calcul & PGCD)
function checkAnswerInput() {
  if (input.value.trim() === '') return;
  totalCount++;
  const userAnswer = parseInt(input.value, 10);
  input.disabled = true;
  btnSubmit.disabled = true;
  btnSubmit.style.opacity = '0.6';

  if (currentMode === 'calcul') {
    if (userAnswer === currentQuestion.expectedC) {
      correctCount++;
      showFeedback('Correct !', true);
    } else {
      showFeedback(`Faux ! La réponse attendue était ${currentQuestion.expectedC}.`, false);
    }
  } else if (currentMode === 'pgcd') {
    if (userAnswer === currentQuestion.expectedPGCD) {
      correctCount++;
      showFeedback('Correct !', true);
    } else {
      showFeedback(`Faux ! PGCD(${currentQuestion.a}, ${currentQuestion.b}) = ${currentQuestion.expectedPGCD}.`, false);
    }
  }

  setTimeout(generateQuestion, 400);
}

// 13. Gestion du changement de mode et de difficulté
function switchMode(newMode) {
  currentMode = newMode;
  const modes = [
    { id: 'affirmation', btn: btnMode1 },
    { id: 'calcul', btn: btnMode2 },
    { id: 'pgcd', btn: btnMode3 }
  ];

  modes.forEach(m => {
    if (m.id === newMode) {
      m.btn.style.backgroundColor = '#4f46e5';
      m.btn.style.color = '#ffffff';
      m.btn.style.borderColor = '#4f46e5';
    } else {
      m.btn.style.backgroundColor = '#ffffff';
      m.btn.style.color = '#374151';
      m.btn.style.borderColor = '#d1d5db';
    }
  });

  if (newMode === 'affirmation') {
    mode1Box.style.display = 'flex';
    inputBox.style.display = 'none';
  } else {
    mode1Box.style.display = 'none';
    inputBox.style.display = 'flex';
  }

  generateQuestion();
}

function switchDifficulty(newDiff) {
  currentDifficulty = newDiff;
  Object.keys(diffButtons).forEach(id => {
    const btn = diffButtons[id];
    if (id === newDiff) {
      btn.style.backgroundColor = '#e0e7ff';
      btn.style.color = '#3730a3';
      btn.style.borderColor = '#c7d2fe';
      btn.style.fontWeight = '600';
    } else {
      btn.style.backgroundColor = '#ffffff';
      btn.style.color = '#374151';
      btn.style.borderColor = '#d1d5db';
      btn.style.fontWeight = '500';
    }
  });
  generateQuestion();
}

// 14. Écouteurs d'événements
btnMode1.addEventListener('click', () => switchMode('affirmation'));
btnMode2.addEventListener('click', () => switchMode('calcul'));
btnMode3.addEventListener('click', () => switchMode('pgcd'));
btnYes.addEventListener('click', () => checkAnswerMode1(true));
btnNo.addEventListener('click', () => checkAnswerMode1(false));
btnSubmit.addEventListener('click', checkAnswerInput);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') checkAnswerInput();
});

// 15. Démarrage de l'application
switchDifficulty('facile');
switchMode('affirmation');