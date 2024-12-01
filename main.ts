// bench/main.ts
interface Solution {
  username: string;
  code: string;
  executionTime: number;
  day: number;
}

interface TestCase {
  input: string;
  expected: string;
}

const testCases: Record<number, TestCase> = {
  1: {
    input: await fetch(import.meta.resolve("./puzzles/day1.txt"))
      .then((r) => r.text()),
    expected: "1579939",
  },
};

const solutions: Solution[] = [];

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
    // Others
    "while(true)",
    "while (true)",
    "for(;;)",
    "for (;;)",
  ];

  for (const pattern of dangerousPatterns) {
    if (code.includes(pattern)) {
      throw new Error(`Forbidden code pattern: ${pattern}`);
    }
  }
}

async function runCode(code: string, day: number): Promise<number> {
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

        if (String(result) !== testCase.expected) {
          throw new Error(`Expected ${testCase.expected} but got ${result}`);
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
      const day = parseInt(url.pathname.split("/").pop() || "1");
      const daySolutions = solutions.filter((s) => s.day === day);
      return new Response(JSON.stringify(daySolutions), {
        headers: { "content-type": "application/json" },
      });
    }

    // Submit new solution
    if (req.method === "POST") {
      const data = await req.json();
      const day = parseInt(data.day);

      try {
        const executionTime = await runCode(data.code, day);

        const solution: Solution = {
          username: data.username,
          code: data.code,
          executionTime,
          day,
        };

        solutions.push(solution);
        return new Response(JSON.stringify(solution), {
          headers: { "content-type": "application/json" },
        });
      } catch (error) {
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
    return new Response(JSON.stringify({ input: testCase.input }), {
      headers: { "content-type": "application/json" },
    });
  }

  return new Response("Not found", { status: 404 });
}

console.log("Server running on http://localhost:8000");
Deno.serve({ port: 8000 }, handleRequest);
