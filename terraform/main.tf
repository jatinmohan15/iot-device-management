provider "aws" {
  region  = "us-east-1"
  profile = "iot-user-fresh"
}

resource "aws_vpc" "iot_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = {
    Name = "iot-vpc"
  }
}

resource "aws_internet_gateway" "iot_igw" {
  vpc_id = aws_vpc.iot_vpc.id
  tags = {
    Name = "iot-igw"
  }
}

resource "aws_subnet" "public_subnet_1" {
  vpc_id                  = aws_vpc.iot_vpc.id
  cidr_block              = "10.0.5.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true
  tags = {
    Name = "iot-public-subnet-1"
  }
}

resource "aws_subnet" "public_subnet_2" {
  vpc_id                  = aws_vpc.iot_vpc.id
  cidr_block              = "10.0.6.0/24"
  availability_zone       = "us-east-1b"
  map_public_ip_on_launch = true
  tags = {
    Name = "iot-public-subnet-2"
  }
}

resource "aws_subnet" "private_subnet_3" {
  vpc_id                  = aws_vpc.iot_vpc.id
  cidr_block              = "10.0.7.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = false
  tags = {
    Name = "iot-private-subnet-3"
  }
}

resource "aws_subnet" "private_subnet_4" {
  vpc_id                  = aws_vpc.iot_vpc.id
  cidr_block              = "10.0.8.0/24"
  availability_zone       = "us-east-1b"
  map_public_ip_on_launch = false
  tags = {
    Name = "iot-private-subnet-4"
  }
}

resource "aws_route_table" "iot_public_rt" {
  vpc_id = aws_vpc.iot_vpc.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.iot_igw.id
  }
  tags = {
    Name = "iot-public-rt"
  }
}

resource "aws_route_table_association" "public_subnet_1_assoc" {
  subnet_id      = aws_subnet.public_subnet_1.id
  route_table_id = aws_route_table.iot_public_rt.id
}

resource "aws_route_table_association" "public_subnet_2_assoc" {
  subnet_id      = aws_subnet.public_subnet_2.id
  route_table_id = aws_route_table.iot_public_rt.id
}

resource "aws_db_subnet_group" "iot_db_subnet_group_new" {
  name       = "iot-db-subnet-group-new"
  subnet_ids = [aws_subnet.private_subnet_3.id, aws_subnet.private_subnet_4.id]
  tags = {
    Name = "iot-db-subnet-group-new"
  }
}

resource "aws_elasticache_subnet_group" "iot_redis_subnet_group" {
  name       = "iot-redis-subnet-group-public"
  subnet_ids = [aws_subnet.public_subnet_1.id, aws_subnet.public_subnet_2.id]
  description = "Public subnet group for iot-redis"
}

resource "aws_security_group" "rds_sg" {
  vpc_id = aws_vpc.iot_vpc.id
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = {
    Name = "iot-rds-sg"
  }
}

resource "aws_security_group" "redis_sg" {
  vpc_id = aws_vpc.iot_vpc.id
  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = {
    Name = "iot-redis-sg"
  }
}

resource "aws_db_instance" "iot_db" {
  identifier             = "iot-db-new"
  engine                 = "postgres"
  engine_version         = "16.4"
  instance_class         = "db.t3.micro"
  allocated_storage      = 20
  db_name                = "iot_db"
  username               = "iotadmin"
  password               = "JatinIoTPass2025!"
  db_subnet_group_name   = aws_db_subnet_group.iot_db_subnet_group_new.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  skip_final_snapshot    = true
  publicly_accessible    = true
  apply_immediately      = true
  tags = {
    Name = "iot-db-new"
  }
}

resource "aws_elasticache_cluster" "iot_redis" {
  cluster_id           = "iot-redis"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  subnet_group_name    = aws_elasticache_subnet_group.iot_redis_subnet_group.name
  security_group_ids   = [aws_security_group.redis_sg.id]
  apply_immediately    = true
}

resource "aws_s3_bucket" "iot_audit_bucket" {
  bucket = "iot-audit-bucketm-main15"
  tags = {
    Name = "iot-audit-bucket"
  }
}