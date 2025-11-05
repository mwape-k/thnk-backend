<img width="1920" height="684" alt="PITCH BANNER-bank" src="https://github.com/user-attachments/assets/5515a36e-29b5-4929-bb82-fbb66edab01d" />
<h1 align="center">THNK.</h1>
<h4 align="center">Backend Repo • <a href="https://github.com/mwape-k/thnk-frontend">Frontend Repo</a></h4>

___
## About The Project   
Empowering critical thinking through AI-powered bias analysis

### 1.1 Project Description 
**THNK** is an interactive research tool that helps users analys.e information sources for bias, neutrality, and credibility. By leveraging AI-powered analysis, **THNK** provides comprehensive insights into the reliability of information and encourages deeper critical thinking about media consumption.

Built with a modern tech stack focusing on real-time analysis and intuitive visualisation, THNK enables users to:

- **AI-Powered Analysis:** Process URLs and research prompts to generate comprehensive bias assessments
- **Interactive Mind Maps:** Visualise sources and their relationships through dynamic node-based interfaces
- **Bias Scoring:** Evaluate content for neutrality, persuasion, and sentiment with detailed metrics
- **Source Credibility:** Assess the reliability of information sources with transparency
- **Educational Insights:** Provide critical thinking questions and research suggestions for deeper understanding

THNK transforms how users approach research by making bias analysis accessible, educational, and actionable.

### 1 Built With 

**Backend & APIs**  
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white) ![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white) ![Google Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)

**Authentication & Deployment**  
![Firebase Auth](https://img.shields.io/badge/Firebase_Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black) ![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

---

## Getting Started

### 2 Prerequisites

- ![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=nodedotjs&logoColor=white) Version 18 or higher  
- ![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-47A248?style=flat-square&logo=mongodb&logoColor=white) Local or Atlas instance
- ![Google Gemini API](https://img.shields.io/badge/Gemini_API-4285F4?style=flat-square&logo=google&logoColor=white) API key for AI analysis
- ![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black) Project for authentication

### 2 Installation Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/thnk.git
   cd thnk/backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Environment configuration:
   ```bash
   # Create .env file with:
   MONGODB_URI=your_mongodb_connection_string
   GEMINI_API_KEY=your_gemini_api_key
   FIREBASE_SERVICE_ACCOUNT=your_firebase_service_account_json
   NODE_ENV=production
   PORT=5000
   ```
4. Start the server:
   ```bash
   npm run dev
   ```
Here's the markdown section for Railway deployment that you can add to your README:

## 3 Deployment

### Backend Deployment on Railway

The THNK backend is deployed on **Railway** for reliable, scalable hosting with seamless MongoDB integration.

#### Railway Configuration

**Environment Variables Required:**
```env
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_SERVICE_ACCOUNT=your_firebase_service_account_json
NODE_ENV=production
PORT=5000
```

#### Deployment Steps

1. **Connect Repository:**
   - Link your GitHub repository to Railway
   - Railway automatically detects the Node.js backend

2. **Environment Variables:**
   - Add all required environment variables in Railway dashboard
   - Set `NODE_ENV=production` for optimised performance

3. **Database Setup:**
   - Use Railway's MongoDB plugin or external MongoDB Atlas
   - Railway automatically provides `MONGODB_URI`

4. **Deploy:**
   - Railway automatically deploys on git push to main branch
   - Monitor deployments in the Railway dashboard

#### Railway Service Configuration

**`railway.toml`** (if using configuration file):
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"

[env]
NODE_ENV = "production"
PORT = "5000"
```

#### Deployment URL
Your backend will be available at:
```
https://your-app-name.up.railway.app
```

#### Frontend Configuration
Update your frontend `.env` to point to the Railway URL:
```env
REACT_APP_API_URL=https://your-app-name.up.railway.app/api
```

### Benefits of Railway Deployment

- **Zero-downtime deployments**
- **Automatic scaling**
- **Built-in MongoDB integration**
- **SSL certificates automatically configured**
- **Built-in monitoring and logs**
- **Generous free tier**

### Monitoring & Logs

Access your application logs through:
- Railway Dashboard → Your App → Logs
- Real-time deployment status and error tracking

This deployment setup ensures your THNK backend is production-ready with minimal configuration overhead!
