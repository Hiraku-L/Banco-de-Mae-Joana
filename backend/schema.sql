-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    saldo DECIMAL(10,2) DEFAULT 0
);

-- Create transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    destinatario VARCHAR(255) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    data TIMESTAMP DEFAULT NOW()
);

-- Create movie_sessions table
CREATE TABLE movie_sessions (
    id SERIAL PRIMARY KEY,
    requester_id UUID REFERENCES users(id),
    movie_id INTEGER NOT NULL,
    movie_title TEXT NOT NULL,
    duration INTEGER NOT NULL,
    price_per_person DECIMAL(10,2) NOT NULL,
    selected_users JSONB NOT NULL, -- array of user_ids
    confirmations JSONB DEFAULT '{}' -- object user_id: boolean
);