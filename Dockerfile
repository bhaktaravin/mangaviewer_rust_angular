# Use the official Rust image as the base
FROM rust:latest AS builder

# Set the working directory
WORKDIR /usr/src/app

# Copy only the Cargo files first to leverage Docker's caching
COPY Cargo.toml Cargo.lock ./

# Pre-fetch dependencies to cache them
RUN cargo fetch

# Copy the source code
COPY . .

# Build the project in release mode (using the actual binary name from Cargo.toml)
RUN cargo build --release --bin main

# Use a minimal base image for the final stage
FROM debian:bookworm-slim

# Install CA certificates for HTTPS requests
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV PORT=8080
ENV RUST_LOG=info

# Set the working directory
WORKDIR /app

# Copy the compiled binary from the builder stage
COPY --from=builder /usr/src/app/target/release/main ./main

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]
