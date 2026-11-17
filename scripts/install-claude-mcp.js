#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

function installClaudeMcp() {
  console.log('🤖 Setting up Budget Tracker MCP Server for Claude Desktop...\n');

  // Locate Claude Desktop config path on Windows / Mac / Linux
  let configDir = '';
  if (process.platform === 'win32') {
    configDir = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Claude');
  } else if (process.platform === 'darwin') {
    configDir = path.join(os.homedir(), 'Library', 'Application Support', 'Claude');
  } else {
    configDir = path.join(os.homedir(), '.config', 'Claude');
  }

  const configFile = path.join(configDir, 'claude_desktop_config.json');
  const serverScript = path.resolve(__dirname, '../mcp-server/index.mjs');

  console.log(`Claude Config Directory: ${configDir}`);
  console.log(`Claude Config File:      ${configFile}`);
  console.log(`MCP Server Script:       ${serverScript}\n`);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    console.log(`Created Claude configuration directory: ${configDir}`);
  }

  let currentConfig = { mcpServers: {} };
  if (fs.existsSync(configFile)) {
    try {
      const raw = fs.readFileSync(configFile, 'utf8');
      if (raw.trim()) {
        currentConfig = JSON.parse(raw);
        if (!currentConfig.mcpServers) currentConfig.mcpServers = {};
      }
    } catch (e) {
      console.warn('Existing config could not be parsed as JSON, backing up to .bak');
      fs.copyFileSync(configFile, `${configFile}.bak.${Date.now()}`);
      currentConfig = { mcpServers: {} };
    }
  }

  // Register budget-tracker
  currentConfig.mcpServers['budget-tracker'] = {
    command: 'node',
    args: [serverScript]
  };

  fs.writeFileSync(configFile, JSON.stringify(currentConfig, null, 2), 'utf8');

  console.log('🎉 Successfully configured Claude Desktop!');
  console.log('The "budget-tracker" MCP server is now registered in Claude Desktop.');
  console.log('\nTo use it:');
  console.log('1. Restart Claude Desktop completely.');
  console.log('2. Look for the 🔌 hammer/tools icon in Claude chat - you should see 30 Budget Tracker tools available!');
  console.log('3. Now you can paste receipts, bank statements, or simply tell Claude:');
  console.log('   "I spent ₹1,200 at Starbucks using my credit card, add it."');
  console.log('   "Here is my bank statement SMS: [paste], add all transactions."');
  console.log('   "Give me a summary of my net worth and upcoming bills."');
}

installClaudeMcp();
