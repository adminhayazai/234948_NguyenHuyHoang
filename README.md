
# BOOKCLOUD - CLOUD BOOK MANAGEMENT SYSTEM

## Thong tin sinh vien
- Ho ten: Nguyen Huy Hoang
- MSSV: 234948
- Hoc phan: Dien toan dam may

## Gioi thieu
BookCloud la he thong quan ly sach tren nen tang dam may, ho tro quan ly danh sach sach, tim kiem, xem chi tiet, them, cap nhat va xoa sach.

## Cong nghe su dung
- Frontend: React, Vite
- Backend: Node.js, Express
- Database: MongoDB Atlas, Mongoose
- Quan ly ma nguon: Git, GitHub
- Container: Docker, Docker Hub, Nginx
- Trien khai: Render

## Cau truc du an
- Backend/: API Express, MongoDB, Dockerfile
- Frontend/: React, Vite, Nginx, Dockerfile
- README.md: Tai lieu huong dan

## API
- GET /health
- GET /api/books
- GET /api/books/:id
- GET /api/books?search=cloud
- POST /api/books
- PUT /api/books/:id
- DELETE /api/books/:id

## Cai dat va chay Local

### Backend
cd Backend
npm install

Tao file .env voi:
PORT=5000
MONGODB_URI=<YOUR_MONGODB_CONNECTION_STRING>
CLIENT_URL=http://localhost:5173

Sau do chay:
node server.js

### Frontend
cd Frontend
npm install
npm run dev

Truy cap: http://localhost:5173

## Docker
Backend:
docker build -t bookcloud-backend:local ./Backend

Frontend:
docker build --build-arg VITE_API_URL=https://api-234948.onrender.com -t hhyaz28/frontend:latest ./Frontend

## Duong dan trien khai
- GitHub: https://github.com/adminhayazai/234948_NguyenHuyHoang
- Docker Backend: https://hub.docker.com/r/hhyaz28/backend
- Docker Frontend: https://hub.docker.com/r/hhyaz28/frontend
- Render Frontend: https://web-234948.onrender.com
- Render Backend: https://api-234948.onrender.com
- MongoDB Database: 234948_NguyenHuyHoang
- MongoDB Collection: books

## Bao mat
- Khong commit file .env
- Khong cong khai mat khau MongoDB
- Cau hinh bien moi truong rieng tren Render
