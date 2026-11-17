import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('Testing Budget Tracker MCP Server...');
  const serverPath = path.resolve(__dirname, '../mcp-server/index.mjs');

  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath]
  });

  const client = new Client(
    { name: 'test-client', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log('Connected to MCP server!');

  // List tools
  const toolsResult = await client.listTools();
  console.log(`Registered Tools (${toolsResult.tools.length}):`);
  toolsResult.tools.forEach(t => console.log(` - ${t.name}: ${t.description.slice(0, 60)}...`));

  // Test get_financial_overview
  console.log('\nCalling get_financial_overview...');
  const overviewResult = await client.callTool({
    name: 'get_financial_overview',
    arguments: {}
  });
  console.log('Result:\n', overviewResult.content[0].text);

  // Test add_transaction
  console.log('\nCalling add_transaction...');
  const addResult = await client.callTool({
    name: 'add_transaction',
    arguments: {
      amount: 450,
      type: 'expense',
      description: 'Coffee at Blue Tokai',
      category: 'Food & Dining',
      account: 'Main Checking'
    }
  });
  console.log('Add Result:\n', addResult.content[0].text);

  // Test get_transactions
  console.log('\nCalling get_transactions...');
  const getTxResult = await client.callTool({
    name: 'get_transactions',
    arguments: { limit: 5 }
  });
  console.log('Get Transactions Result:\n', getTxResult.content[0].text);

  await client.close();
  console.log('\nMCP Server Test Passed with Flying Colors!');
}

run().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
