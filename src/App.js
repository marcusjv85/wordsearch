import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import foundSound from "./found.wav"; // Ensure your sound file is correctly imported

const WORDS = ["APPLE", "ORANGE", "BANANA", "GRAPE", "MELON"];
const GRID_SIZE = 10;
const WORD_COLORS = ["#FF5733", "#33FF57", "#3357FF", "#FF33A1", "#FFC300"]; // Unique colors for found words

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
    let placed = false,
      attempts = 0;

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
  const generateGridMemoized = useCallback(generateGrid, []);
  const [gridData, setGridData] = useState(generateGridMemoized);
  const [selectedCells, setSelectedCells] = useState([]);
  const [foundWords, setFoundWords] = useState(new Set());
  const [foundWordPositions, setFoundWordPositions] = useState({}); // Stores positions of found words
  const [isDragging, setIsDragging] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [lastWordTime, setLastWordTime] = useState(0);
  const [wordTimes, setWordTimes] = useState([]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const startGame = () => {
    setGridData(generateGridMemoized());
    setFoundWords(new Set());
    setFoundWordPositions({});
    setIsRunning(false);
    setGameStarted(true);
    setLastWordTime(0);
    setWordTimes([]);
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
        const timeTaken = timer - lastWordTime;
        const updatedWordTimes = [...wordTimes, timeTaken];

        setWordTimes(updatedWordTimes);
        setLastWordTime(timer);
        setFoundWordPositions((prevPositions) => ({
          ...prevPositions,
          [matchedWord]: gridData.wordPositions[matchedWord],
        }));

        if (!isRunning) setIsRunning(true);

        if (newFoundWords.size === WORDS.length) {
          setIsRunning(false);
          const avgTime =
            updatedWordTimes.length > 0
              ? updatedWordTimes.reduce((sum, t) => sum + t, 0) /
                updatedWordTimes.length
              : 0;

          alert(
            `🎉 Congrats! You found all words in ${timer} seconds!\n📊 Avg Time Per Word: ${avgTime.toFixed(
              2
            )} seconds`
          );
          startGame();
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
        Start Game
      </button>
      <h2>Time: {timer}s</h2>

      <div className="grid">
        {gridData.grid.map((row, rowIndex) => (
          <div key={rowIndex} className="row">
            {row.map((letter, colIndex) => {
              const isSelected = selectedCells.some(
                ([r, c]) => r === rowIndex && c === colIndex
              );
              const foundWord = [...foundWords].find((word) =>
                foundWordPositions[word]?.has(`${rowIndex}-${colIndex}`)
              );
              const highlightColor = foundWord
                ? WORD_COLORS[
                    [...foundWords].indexOf(foundWord) % WORD_COLORS.length
                  ]
                : isSelected
                ? "#87cefa"
                : "transparent";

              return (
                <div
                  key={colIndex}
                  className="cell"
                  style={{ backgroundColor: highlightColor }}
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
          {WORDS.map((word, index) => (
            <li
              key={index}
              className={foundWords.has(word) ? "found" : ""}
              style={{ color: WORD_COLORS[index % WORD_COLORS.length] }}
            >
              {word}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default App;
