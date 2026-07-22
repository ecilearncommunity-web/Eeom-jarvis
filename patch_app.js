const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const helper = `
const googleApiProxy = async (url: string, options?: RequestInit) => {
  return await fetch('/api/proxy/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      method: options?.method || 'GET',
      headers: options?.headers || {},
      body: options?.body,
    })
  });
};
`;

// Insert the helper at the beginning of the App component
content = content.replace(/export default function App\(\) \{/, 'export default function App() {\n' + helper);

// Replace all fetch calls that hit googleapis.com with googleApiProxy
content = content.replace(/await fetch\(("https:\/\/[^"]*googleapis\.com[^"]*"),/g, 'await googleApiProxy($1,');
content = content.replace(/await fetch\((`https:\/\/[^`]*googleapis\.com[^`]*`),/g, 'await googleApiProxy($1,');

fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx patched successfully');
