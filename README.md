IoT Device Management Dashboard
A DevOps project to manage IoT devices with a React dashboard, Node.js backend, and simulated IoT data. Deployed on AWS EKS with monitoring via Prometheus/Grafana.
Security and Dependency Notes

jsonwebtoken: Uses jsonwebtoken@8.5.1 for simplicity in this portfolio project. This version has known vulnerabilities (GHSA-8cf7-32gw-wr33, GHSA-hjrf-2m68-5959, GHSA-qwph-4952-7xr6). For production, I would upgrade to jsonwebtoken@9.0.2 and update the code to handle breaking changes.
aws-sdk: Uses AWS SDK v2 (aws-sdk@^2.1000.0) for S3 audit logging. AWS recommends migrating to v3 for new features, but v2 is functional for this project.
querystring: A depreciation warning for the querystring module (a sub-dependency) does not impact functionality.
