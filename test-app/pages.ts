const layout = ({ title, description, body }: {
  title: string;
  description: string;
  body: string;
}) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <style>.debug-only { display: none; }</style>
</head>
<body>
  <nav>
    <a href="/">Home</a>
    <a href="/pricing">Pricing</a>
    <a href="/about">About</a>
  </nav>
  ${body}
  <footer>
    <p>Footer link that should not appear in extracted content.</p>
    <a href="/privacy">Privacy</a>
  </footer>
  <script>console.log("tracking pixel noise, should never be extracted");</script>
</body>
</html>`;

const PAGES = {
  "/": () =>
    layout({
      title: "Home",
      description: "The homepage of the test application",
      body: `
        <main data-site-content>
          <h1>Welcome home</h1>
          <p>This is the homepage used to exercise the extractor.</p>
          <div data-site-content-ignore>
            <p>This block is explicitly marked as ignored and must never appear in output.</p>
          </div>
          <p class="debug-only" style="display:none">This paragraph is hidden and must be excluded.</p>
          <p>Second visible paragraph on the homepage.</p>
          <a href="/pricing">See pricing</a>
        </main>
      `,
    }),

  "/pricing": () =>
    layout({
      title: "Pricing",
      description: "Simple pricing for developers",
      body: `
        <main data-site-content>
          <h1>Simple pricing</h1>
          <h2>Choose your plan</h2>
          <p>Start building for free.</p>
          <a href="/signup">Get started</a>
        </main>
      `,
    }),

  "/about": () =>
    layout({
      title: "About",
      description: "About the test application",
      body: `
        <article>
          <h1>About us</h1>
          <p>We build tools for local developers.</p>
          <p>We build tools for local developers.</p>
        </article>
      `,
    }),

  "/dynamic": () =>
    layout({
      title: "Dynamic",
      description: "Client-rendered content example",
      body: `
        <main data-site-content>
          <div id="root">
            <p>Loading…</p>
          </div>
        </main>
        <script>
          setTimeout(function () {
            var root = document.getElementById("root");
            root.innerHTML =
              "<h1>Dynamically rendered heading</h1>" +
              "<p data-testid=\\"dynamic-paragraph\\">This paragraph was injected client-side after a delay.</p>";
            root.setAttribute("data-ready", "true");
          }, 300);
        </script>
      `,
    }),

  "/404": () =>
    layout({
      title: "Not found",
      description: "This route does not exist",
      body: `<main data-site-content><h1>Page not found</h1></main>`,
    }),
};

export default PAGES ;
