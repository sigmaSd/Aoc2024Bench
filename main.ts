// bench/main.ts
interface Solution {
  username: string;
  code: string;
  executionTime: number;
  day: number;
  part: 1 | 2;
}

interface TestCase {
  input: string;
  expected: {
    part1: string;
    part2: string;
  };
}

const testCases: Record<number, TestCase> = {
  1: {
    input: await fetch(import.meta.resolve("./puzzles/day1.txt"))
      .then((r) => r.text()),
    expected: {
      part1: "1579939",
      part2: "20351745",
    },
  },
  2: {
    input: await fetch(import.meta.resolve("./puzzles/day2.txt"))
      .then((r) => r.text()),
    expected: {
      part1: "379",
      part2: "430",
    },
  },
};

// Initialize KV store
const kv = await Deno.openKv();

// Helper functions for KV operations
async function getSolutions(day?: number, part?: number): Promise<Solution[]> {
  const solutions: Solution[] = [];
  const prefix = ["solutions"];

  // Use number as strings for key components
  if (day !== undefined) prefix.push(String(day));
  if (part !== undefined) prefix.push(String(part));

  console.log("Fetching solutions with prefix:", prefix);

  const entries = kv.list({ prefix });
  for await (const entry of entries) {
    console.log("Found entry:", entry);
    solutions.push(entry.value as Solution);
  }

  console.log("Returning solutions:", solutions);
  return solutions;
}

async function saveSolution(solution: Solution) {
  const timestamp = Date.now();
  const key = [
    "solutions",
    String(solution.day),
    String(solution.part),
    String(timestamp),
  ];

  console.log("Saving solution:", {
    key,
    solution,
  });

  await kv.set(key, solution);
}

function validateCode(code: string) {
  if (code.length > 10000) {
    throw new Error("Code too long (max 10000 chars)");
  }

  const dangerousPatterns = [
    "Deno.",
    "fetch(",
    "import",
    "require",
    "process",
    "__proto__",
    "constructor",
    "prototype",
    "globalThis",
    "window",
    // File system
    "readFile",
    "writeFile",
    "mkdir",
    "remove",
    // Network
    "listen",
    "connect",
    // Eval and friends
    "eval(",
    "Function(",
    // Timing
    "setTimeout",
    "setInterval",
  ];

  for (const pattern of dangerousPatterns) {
    if (code.includes(pattern)) {
      throw new Error(`Forbidden code pattern: ${pattern}`);
    }
  }
}

async function runCode(
  code: string,
  day: number,
  part: 1 | 2,
): Promise<number> {
  const testCase = testCases[day];
  if (!testCase) {
    throw new Error(`No test case for day ${day}`);
  }

  validateCode(code);

  return await Promise.race([
    new Promise<number>((resolve, reject) => {
      try {
        const startTime = performance.now();

        // Create solution function in isolated scope
        const fn = eval(`
          (input) => {
            ${code}
            return solution(input);
          }
        `);

        const result = fn(testCase.input);
        const expected = part === 1
          ? testCase.expected.part1
          : testCase.expected.part2;

        if (String(result) !== expected) {
          throw new Error(`Expected ${expected} but got ${result}`);
        }

        const executionTime = performance.now() - startTime;
        resolve(executionTime);
      } catch (error) {
        reject(
          new Error(
            `Execution error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        );
      }
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Execution timeout (5s)")), 5000)
    ),
  ]);
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Serve main page
  if (url.pathname === "/") {
    try {
      const html = await Deno.readTextFile("./index.html");
      return new Response(html, {
        headers: { "content-type": "text/html" },
      });
    } catch {
      return new Response("Error loading HTML file", { status: 500 });
    }
  }

  // API endpoints
  if (url.pathname.startsWith("/api/solutions")) {
    // Get solutions for a specific day
    if (req.method === "GET") {
      try {
        const segments = url.pathname.split("/");
        const day = parseInt(segments[segments.length - 2]);
        const part = parseInt(segments[segments.length - 1]) as 1 | 2;

        if (isNaN(day) || isNaN(part)) {
          throw new Error("Invalid day or part");
        }

        console.log(`Fetching solutions for day ${day} part ${part}`);
        const solutions = await getSolutions(day, part);

        return new Response(JSON.stringify(solutions), {
          headers: { "content-type": "application/json" },
        });
      } catch (error) {
        console.error("Error fetching solutions:", error);
        return new Response(
          JSON.stringify({ error: "Error fetching solutions" }),
          {
            status: 500,
            headers: { "content-type": "application/json" },
          },
        );
      }
    }

    // Submit new solution
    if (req.method === "POST") {
      const data = await req.json();
      const day = parseInt(data.day);
      const part = parseInt(data.part) as 1 | 2;

      try {
        console.log("Received solution submission:", {
          day,
          part,
          username: data.username,
        });

        const executionTime = await runCode(data.code, day, part);

        const solution: Solution = {
          username: data.username,
          code: data.code,
          executionTime,
          day,
          part,
        };

        await saveSolution(solution);
        console.log("Solution saved successfully");

        return new Response(JSON.stringify(solution), {
          headers: { "content-type": "application/json" },
        });
      } catch (error) {
        console.error("Error saving solution:", error);
        return new Response(
          JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
          {
            status: 400,
            headers: { "content-type": "application/json" },
          },
        );
      }
    }
  }

  // API endpoint to get test input
  if (url.pathname.startsWith("/api/input/")) {
    const day = parseInt(url.pathname.split("/").pop() || "1");
    const testCase = testCases[day];
    if (!testCase) {
      return new Response("No test case found", { status: 404 });
    }
    return new Response(
      JSON.stringify({
        input: testCase.input,
        expected: testCase.expected,
      }),
      {
        headers: { "content-type": "application/json" },
      },
    );
  }

  return new Response("Not found", { status: 404 });
}

// Cleanup function for graceful shutdown
Deno.addSignalListener("SIGINT", () => {
  kv.close();
  Deno.exit();
});

console.log("Server running on http://localhost:8000");
Deno.serve({ port: 8000 }, handleRequest);
