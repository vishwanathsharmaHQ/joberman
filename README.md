# Joberman

A modern job application tracking and resume parsing service that helps streamline your job search process. The application provides a robust backend API for handling resumes, user data, and job applications with integration capabilities for AI-powered parsing.

## Features

- **Resume Management**: Upload and parse PDF resumes
- **AI-Powered Parsing**: 
  - Integration with Mistral AI for advanced document understanding
  - OpenAI integration capabilities
- **Database Integration**:
  - PostgreSQL with Prisma ORM
  - Neon Database serverless support
- **Modern Architecture**:
  - RESTful API endpoints
  - TypeScript for type safety
  - Modular service-based architecture

## Tech Stack

- **Backend**:
  - Node.js with Express
  - TypeScript
  - Prisma ORM
  - PostgreSQL (with Neon Database)
  
- **AI/ML Integration**:
  - Mistral AI SDK
  - OpenAI SDK
  
- **File Processing**:
  - Multer for file uploads
  - pdf-parse for PDF processing

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd joberman
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="your-database-url"

# AI Services
MISTRAL_API_KEY="your-mistral-api-key"
OPENAI_API_KEY="your-openai-api-key"

# Other configurations as needed
```

## Development

1. Start the development server:

```bash
npm start
```

This will:
- Build the TypeScript files
- Start the server with nodemon for auto-reloading

2. The API will be available at `http://localhost:<port>`

## Project Structure

```
joberman/
├── src/
│   ├── controllers/    # Request handlers
│   ├── middleware/     # Express middleware
│   ├── routes/        # API routes
│   ├── services/      # Business logic
│   ├── types/         # TypeScript type definitions
│   ├── uploads/       # File upload directory
│   └── index.ts       # Application entry point
├── prisma/            # Database schema and migrations
├── public/           # Static files
└── test/             # Test files
```


# Postman APi

The repo includes the postman config file for testing
