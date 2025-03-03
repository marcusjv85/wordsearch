import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import foundSound from "./found.wav"; // Add your sound file

const WORDS = ["APPLE", "ORANGE"];
// const WORDS = ["APPLE", "ORANGE", "BANANA", "GRAPE", "MELON"];
const GRID_SIZE = 10;

const generateGrid = () => {
  let grid = Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(""));

  let wordPositions = {};
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [-1, -1],
    [1, -1],
  ];

  const placeWord = (word) => {
    let placed = false;
    let attempts = 0; // Prevents infinite loops

    while (!placed && attempts < 100) {
      attempts++;
      let row = Math.floor(Math.random() * GRID_SIZE);
      let col = Math.floor(Math.random() * GRID_SIZE);
      let [dx, dy] = directions[Math.floor(Math.random() * directions.length)];

      if (
        row + dy * (word.length - 1) >= 0 &&
        row + dy * (word.length - 1) < GRID_SIZE &&
        col + dx * (word.length - 1) >= 0 &&
        col + dx * (word.length - 1) < GRID_SIZE
      ) {
        let valid = true;
        let positions = [];

        for (let i = 0; i < word.length; i++) {
          if (grid[row + dy * i]?.[col + dx * i] !== "") {
            valid = false;
            break;
          }
          positions.push(`${row + dy * i}-${col + dx * i}`);
        }

        if (valid) {
          wordPositions[word] = new Set(positions);
          wordPositions[word.split("").reverse().join("")] = new Set(positions);
          for (let i = 0; i < word.length; i++) {
            grid[row + dy * i][col + dx * i] = word[i];
          }
          placed = true;
        }
      }
    }
  };

  WORDS.forEach(placeWord);

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c]) {
        grid[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      }
    }
  }

  console.log("Generated Grid:", grid);
  return { grid, wordPositions };
};

const App = () => {
  const generateGridMemoized = useCallback(generateGrid, []);
  const [gridData, setGridData] = useState(generateGridMemoized);
  const [selectedCells, setSelectedCells] = useState([]);
  const [foundWords, setFoundWords] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [lastWordTime, setLastWordTime] = useState(0); // Stores last found word time
  const [wordTimes, setWordTimes] = useState([]); // Stores all word find times

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const startGame = () => {
    setGridData(generateGridMemoized()); // Reset the grid
    setFoundWords(new Set()); // Reset found words
    setIsRunning(false); // Timer does not start immediately
    setGameStarted(true);
    setLastWordTime(0);
    setWordTimes([]); // Reset word find times
    setTimer(0);
  };

  const playSound = () => {
    const foundAudio = new Audio(foundSound);
    foundAudio.play().catch((error) => console.log("Audio play error:", error));
  };

  const handleMouseDown = (row, col) => {
    setSelectedCells([[row, col]]);
    setIsDragging(true);
  };

  const handleMouseEnter = (row, col) => {
    if (!isDragging) return;
    setSelectedCells((prev) => [...prev, [row, col]]);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    validateSelection();
  };

  const validateSelection = () => {
    const selectedLetters = selectedCells
      .map(([r, c]) => gridData.grid[r][c])
      .join("");

    let matchedWord = null;
    WORDS.forEach((word) => {
      if (
        selectedLetters === word ||
        selectedLetters === word.split("").reverse().join("")
      ) {
        matchedWord = word;
      }
    });

    if (matchedWord) {
      setFoundWords((prev) => {
        const newFoundWords = new Set([...prev, matchedWord]);

        // ✅ Calculate time since last word was found
        const timeTaken = timer - lastWordTime;
        const updatedWordTimes = [...wordTimes, timeTaken];

        setWordTimes(updatedWordTimes);
        setLastWordTime(timer); // Update last word found time

        // ✅ If this is the first word, start the timer
        if (!isRunning) {
          setIsRunning(true);
        }

        // ✅ If all words are found, stop the game and show stats
        if (newFoundWords.size === WORDS.length) {
          setIsRunning(false);

          // ✅ Ensure the last word's time is included in the avg calculation
          const avgTime =
            updatedWordTimes.length > 0
              ? updatedWordTimes.reduce((sum, t) => sum + t, 0) /
                updatedWordTimes.length
              : 0;

          alert(
            `🎉 Congrats! You found all the words in ${timer} seconds! 🎉\n` +
              `📊 Average Time Per Word: ${avgTime.toFixed(2)} seconds`
          );

          startGame(); // Restart game after alert is closed
        }

        return newFoundWords;
      });

      playSound();
    }

    setSelectedCells([]);
  };

  return (
    <div className="container" onMouseUp={handleMouseUp}>
      <h1>Word Search</h1>
      <button onClick={startGame} disabled={gameStarted}>
        {gameStarted ? "Game Started" : "Start Game"}
      </button>
      <h2>Time: {timer}s</h2>

      {/* ✅ Grid Rendering Fixed */}
      <div className="grid">
        {gridData.grid.map((row, rowIndex) => (
          <div key={rowIndex} className="row">
            {row.map((letter, colIndex) => {
              const isSelected = selectedCells.some(
                ([r, c]) => r === rowIndex && c === colIndex
              );
              const isFound = Object.entries(gridData.wordPositions).some(
                ([word, positions]) =>
                  foundWords.has(word) &&
                  positions.has(`${rowIndex}-${colIndex}`)
              );
              return (
                <div
                  key={colIndex}
                  className={`cell ${isSelected ? "selected" : ""} ${
                    isFound ? "found" : ""
                  }`}
                >
                  <p
                    className="letter"
                    onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                    onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                  >
                    {letter}
                  </p>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="word-list">
        <h3>Find These Words:</h3>
        <ul>
          {WORDS.map((word) => (
            <li key={word} className={foundWords.has(word) ? "found" : ""}>
              {word}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default App;
