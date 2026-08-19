pipeline {
    agent any

    environment {
        GITHUB_REPO = 'Sowbarnika18/novatodo'
        GITHUB_PAGES_BRANCH = 'gh-pages'
    }

    stages {
        stage('Clone') {
            steps {
                echo '📦 Cloning repository...'
                git branch: 'main',
                    url: 'https://github.com/${GITHUB_REPO}.git',
                    credentialsId: 'github-credentials'
            }
        }

        stage('Validate') {
            steps {
                echo '✅ Validating project files...'
                script {
                    if (!fileExists('index.html')) {
                        error 'index.html not found!'
                    }
                }
            }
        }

        stage('Build') {
            steps {
                echo '🔨 Building web application...'
                // For static web apps, build step can include asset optimization
                // Add minification, bundling, or other preprocessing here if needed
                echo 'Web application ready for deployment'
            }
        }

        stage('Test') {
            steps {
                echo '🧪 Running tests...'
                // Add your test commands here
                // Example: npm test, if you add Node.js tests
                echo 'Tests completed'
            }
        }

        stage('Deploy to GitHub Pages') {
            when {
                branch 'main'
            }
            steps {
                echo '🚀 Deploying to GitHub Pages...'
                script {
                    withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                        bat '''
                            git config user.email "jenkins@devops.local"
                            git config user.name "Jenkins DevOps"
                            git checkout --orphan ${GITHUB_PAGES_BRANCH}
                            git rm -rf .
                            git checkout main -- index.html script.js style.css
                            git add .
                            git commit -m "Deploy to GitHub Pages from Jenkins - Build #${BUILD_NUMBER}"
                            git push -u origin ${GITHUB_PAGES_BRANCH} --force
                        '''
                    }
                }
            }
        }
    }

    post {
        success {
            echo '✨ Pipeline executed successfully!'
        }
        failure {
            echo '❌ Pipeline failed. Check logs above for details.'
        }
    }
}