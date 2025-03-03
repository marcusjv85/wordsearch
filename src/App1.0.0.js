import React, { useState, useEffect } from "react";
import "./App.css";
import foundSound from "./found.wav"; // Add your sound file

const WORDS = ["APPLE", "ORANGE", "BANANA", "GRAPE", "MELON"];
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
    [-1, 1], // Right, Down, Diagonal
    [-1, 0],
    [0, -1],
    [-1, -1],
    [1, -1], // Reverse directions
  ];

  const placeWord = (word) => {
    let placed = false;
    while (!placed) {
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

  return { grid, wordPositions };
};

const App = () => {
  const [gridData, setGridData] = useState(generateGrid);
  const [selectedCells, setSelectedCells] = useState([]);
  const [foundWords, setFoundWords] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [direction, setDirection] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const foundAudio = new Audio(foundSound);

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const startGame = () => {
    setIsRunning(true);
    setGameStarted(true);
  };

  const formatTime = (seconds) => {
    const hrs = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  const getDirection = (start, end) => {
    const [r1, c1] = start;
    const [r2, c2] = end;
    return [Math.sign(r2 - r1), Math.sign(c2 - c1)];
  };

  const handleMouseDown = (row, col) => {
    setSelectedCells([[row, col]]);
    setIsDragging(true);
    setDirection(null);
  };

  const handleMouseEnter = (row, col) => {
    if (!isDragging || selectedCells.length === 0) return;

    const firstCell = selectedCells[0];
    if (!firstCell) return;

    const newDirection = getDirection(firstCell, [row, col]);

    if (selectedCells.length === 1) {
      setDirection(newDirection);
    }

    setSelectedCells((prev) => {
      const lastCell = prev[prev.length - 1];
      const [lastRow, lastCol] = lastCell;
      const [dx, dy] = newDirection;

      // ✅ Fix: Only allow selections that stay in a straight line
      if ((row - lastRow) * dy === (col - lastCol) * dx) {
        return [...prev, [row, col]];
      }

      return prev; // Ignore incorrect selections
    });
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
        if (newFoundWords.size === WORDS.length) {
          setIsRunning(false);
          alert(
            `🎉 Congrats! You found all the words in ${formatTime(timer)} 🎉`
          );
        }
        return newFoundWords;
      });
      foundAudio.play();
    }

    setSelectedCells([]);
    setDirection(null);
  };

  return (
    <div className="container" onMouseUp={handleMouseUp}>
      <h1>Word Search</h1>
      <button onClick={startGame} disabled={gameStarted}>
        {gameStarted ? "Game Started" : "Start Game"}
      </button>
      <h2>Time: {formatTime(timer)}</h2>
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
        <h3>Find these words:</h3>
        <ul>
          {WORDS.map((word, index) => (
            <li key={index} className={foundWords.has(word) ? "found" : ""}>
              {word}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default App;
