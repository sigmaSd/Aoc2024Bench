# AOC 2024 Benchmark

https://aoc2024bench.deno.dev/

A web application to benchmark and compare solutions for Advent of Code 2024 puzzles. Users can submit their solutions, see execution times, and compare different approaches.

The application validates solutions against known answers and benchmarks their execution time, making it easy to compare different implementations.

## Features

- Submit solutions for both parts of each day's puzzle
- Real-time validation of solutions against known answers
- Execution time measurement and benchmarking
- View all solutions sorted by execution time
- Compare different approaches and implementations
- Persistent storage using Deno KV
- Code safety validation and sandbox execution
- Statistics tracking (fastest solutions, most active users)

## Getting Started

### Prerequisites

- [Deno](https://deno.land/) installed on your system

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bench
```

2. Create a `puzzles` directory and add your input files:
```bash
mkdir puzzles
# Add day1.txt, day2.txt, etc.
```

3. Run the server:
```bash
deno run --allow-all --unstable-kv main.ts
```

The server will start at `http://localhost:8000`

## Project Structure

```
bench/
├── main.ts           # Server implementation
├── index.html        # Frontend interface
├── puzzles/          # Puzzle inputs
│   └── day1.txt     # Input files for each day
└── README.md        # Project documentation
```

## Usage

### Submitting Solutions

1. Select a day and part from the dropdown menus
2. Enter your username
3. Paste your solution code following the template:
```javascript
function solution(input) {
    // Your code here
    return result;
}
```
4. Click "Submit" to run and validate your solution

### Viewing Solutions

- Click on any day button to view all submitted solutions
- Solutions are displayed separately for Part 1 and Part 2
- Solutions are sorted by execution time (fastest first)
- View code implementation and execution time for each solution

## Security Features

- Code validation to prevent dangerous patterns
- Execution timeout (5 seconds)
- Input size limits (10,000 characters)
- Restricted access to system resources
- HTML escaping for displayed code
- Sandboxed code execution

## Technology Stack

- Deno (Runtime)
- Deno KV (Storage)
- Vanilla JavaScript (Frontend)
- HTML/CSS (UI)

## Limitations

- Solutions must complete within 5 seconds
- Code size limited to 10,000 characters
- Certain JavaScript features are restricted for security
- No external dependencies allowed in solutions
