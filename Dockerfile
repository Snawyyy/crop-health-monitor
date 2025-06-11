# syntax=docker/dockerfile:1

# ── stage 1: get CUDA runtime libs ────────────────────────────────
ARG CUDA_VERSION=12.3.0
FROM nvidia/cuda:${CUDA_VERSION}-devel-ubuntu22.04 AS cuda-base

# ── stage 2: final Airflow image with CUDA + CuPy + Rasterio ──────
FROM apache/airflow:2.8.2-python3.9

USER root

# copy CUDA runtime from the base stage
COPY --from=cuda-base /usr/local/cuda /usr/local/cuda

# set up paths so CuPy finds libcuda
ENV PATH="/usr/local/cuda/bin:${PATH}" \
    LD_LIBRARY_PATH="/usr/local/cuda/lib64:${LD_LIBRARY_PATH}"

# Install OS dependencies as the root user
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        htop \
        gdal-bin \
        libgdal-dev && \
    rm -rf /var/lib/apt/lists/*

# Switch to the airflow user to install Python packages
USER airflow

# Install Python dependencies as the airflow user
RUN pip install --no-cache-dir \
    pynvml==11.* \
    cupy-cuda12x==13.* \
    rasterio==1.3.9 \
    pystac-client

USER airflow