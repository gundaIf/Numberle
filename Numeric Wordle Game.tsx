import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const generateNumber = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const Numberle = () => {
  const [targetNumber, setTargetNumber] = useState('');
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setTargetNumber(generateNumber());
  }, []);

  const handleGuess = () => {
    if (currentGuess.length !== 4 || isNaN(currentGuess)) {
      setMessage('Please enter a valid 4-digit number.');
      return;
    }

    const newGuesses = [...guesses, currentGuess];
    setGuesses(newGuesses);

    if (currentGuess === targetNumber) {
      setGameOver(true);
      setMessage('Congratulations! You guessed the number!');
    } else if (newGuesses.length >= 6) {
      setGameOver(true);
      setMessage(`Game over. The number was ${targetNumber}.`);
    }

    setCurrentGuess('');
  };

  const renderGuess = (guess) => {
    return guess.split('').map((digit, index) => {
      let bgColor = 'bg-gray-300';
      if (digit === targetNumber[index]) {
        bgColor = 'bg-green-500';
      } else if (targetNumber.includes(digit)) {
        bgColor = 'bg-yellow-500';
      }
      return (
        <span key={index} className={`inline-block w-8 h-8 ${bgColor} rounded-full text-center leading-8 mr-1`}>
          {digit}
        </span>
      );
    });
  };

  const resetGame = () => {
    setTargetNumber(generateNumber());
    setGuesses([]);
    setCurrentGuess('');
    setGameOver(false);
    setMessage('');
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-4 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Numberle</h1>
      <div className="mb-4">
        <Input 
          type="text" 
          value={currentGuess} 
          onChange={(e) => setCurrentGuess(e.target.value)}
          placeholder="Enter a 4-digit number"
          maxLength={4}
          disabled={gameOver}
        />
      </div>
      <Button onClick={handleGuess} disabled={gameOver} className="mb-4">
        Guess
      </Button>
      {message && (
        <Alert className="mb-4">
          <AlertTitle>Game Status</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <div className="mb-4">
        {guesses.map((guess, index) => (
          <div key={index} className="mb-2">
            {renderGuess(guess)}
          </div>
        ))}
      </div>
      {gameOver && (
        <Button onClick={resetGame}>Play Again</Button>
      )}
    </div>
  );
};

export default Numberle;
