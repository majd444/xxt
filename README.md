# Chatbot Automation Platform

A comprehensive platform for creating, customizing, and deploying AI chatbots with knowledge base integration and workflow automation.

## Features

- **Chatbot Customization**: Configure chatbot name, system prompt, style settings, and fine-tuning parameters
- **Conversation Starters**: One-click conversation starter buttons that appear above the message input
- **Knowledge Base Management**: Upload and process various document types to create a custom knowledge base
- **Document Extraction**: Extract and view content from uploaded documents
- **Workflow Builder**: Visual workflow editor to design chatbot conversation flows
- **Database Integration**: Save and retrieve chatbot settings from Sevalla database
- **Modern UI**: Clean, accessible interface with dialog components and responsive design

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Prisma (for database)
- Sevalla Database Integration

## Deployment

This application is optimized for deployment on Sevalla. Follow these steps to deploy:

1. Create a Sevalla account at [https://sevalla.com](https://sevalla.com)
2. Create a new application in Sevalla dashboard
3. Connect your GitHub repository to Sevalla
4. Configure environment variables in the Sevalla dashboard
5. Deploy the application

## Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run development server
npm run dev
```

## Database Setup

The application uses Sevalla's database services. To set up:

1. Create a database in Sevalla dashboard
2. Run the migration scripts:
   - sevalla-agents.sql
   - sevalla-setup.sql
   - sevalla-workflows.sql

## License

MIT
