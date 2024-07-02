let targetNumber;
let guesses = [];
let gameOver = false;

function generateNumber() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

function initGame() {
    targetNumber = generateNumber();
    guesses = [];
    gameOver = false;
    document.getElementById('guesses').innerHTML = '';
    document.getElementById('message').textContent = '';
    document.getElementById('guess-input').value = '';
    document.getElementById('guess-input').disabled = false;
    document.getElementById('guess-button').disabled = false;
}

function handleGuess() {
    const guessInput = document.getElementById('guess-input');
    const currentGuess = guessInput.value;
    
    if (currentGuess.length !== 4 || isNaN(currentGuess)) {
        setMessage('Please enter a valid 4-digit number.');
        return;
    }
    
    guesses.push(currentGuess);
    renderGuess(currentGuess);
    guessInput.value = '';
    
    if (currentGuess === targetNumber) {
        endGame('Correct! You win!');
    } else if (guesses.length >= 6) {
        endGame(`Game over. The number was ${targetNumber}.`);
    }
}

function renderGuess(guess) {
    const guessesContainer = document.getElementById('guesses');
    const guessElement = document.createElement('div');
    guessElement.className = 'guess-row';
    guessElement.innerHTML = guess.split('').map((digit, index) => {
        let bgColor = 'gray';
        if (digit === targetNumber[index]) {
            bgColor = 'green';
        } else if (targetNumber.includes(digit)) {
            bgColor = 'yellow';
        }
        return `<span class="digit" style="background-color: ${bgColor};">${digit}</span>`;
    }).join('');
    guessesContainer.appendChild(guessElement);
}

function setMessage(msg) {
    document.getElementById('message').textContent = msg;
}

function endGame(msg) {
    setMessage(msg);
    gameOver = true;
    document.getElementById('guess-input').disabled = true;
    document.getElementById('guess-button').disabled = true;
}

document.addEventListener('DOMContentLoaded', () => {
    initGame();
    document.getElementById('guess-button').addEventListener('click', handleGuess);
    document.getElementById('guess-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleGuess();
    });
});
