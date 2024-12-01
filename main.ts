interface Solution {
  username: string;
  code: string;
  executionTime: number;
  day: number;
}

const solutions: Solution[] = [];

async function runCode(code: string): Promise<number> {
  const command = new Deno.Command("deno", {
    args: ["run", "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });

  const process = command.spawn();

  try {
    const writer = process.stdin.getWriter();
    await writer.write(new TextEncoder().encode(code));
    await writer.close();

    const startTime = performance.now();

    const status = await Promise.race([
      process.status,
      new Promise((_, reject) =>
        setTimeout(() => {
          try {
            process.kill();
          } catch { /* */ }
          reject(new Error("Execution timeout"));
        }, 5000)
      ),
    ]);

    const executionTime = performance.now() - startTime;

    if (!status.success) {
      throw new Error("Execution failed");
    }

    return executionTime;
  } catch (error) {
    throw new Error(
      `Execution error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
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

      try {
        const executionTime = await runCode(data.code);

        const solution: Solution = {
          username: data.username,
          code: data.code,
          executionTime,
          day: parseInt(data.day),
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

  return new Response("Not found", { status: 404 });
}

console.log("Server running on http://localhost:8000");
Deno.serve({ port: 8000 }, handleRequest);
