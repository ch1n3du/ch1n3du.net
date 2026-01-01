---
title: "Quantum Circuit Simulator"
description: "Educational quantum computing simulator with visual circuit builder and step-by-step execution for learning quantum algorithms."
date: 2024-03-15
year: "2024"
status: "archived"
technologies: ["Python", "NumPy", "Qt"]
github: "https://github.com/ch1n3du/quantum-sim"
draft: true
---

## Motivation

Built as a teaching tool for understanding quantum algorithms without requiring deep knowledge of linear algebra. The simulator emphasizes visual representation and intuitive understanding of quantum state evolution.

## Features

- Visual circuit builder with drag-and-drop gates
- Step-by-step execution with state vector visualization
- Built-in implementations of Deutsch-Jozsa, Grover's, and Shor's algorithms
- Measurement statistics and histogram plotting

## Implementation

The simulator represents quantum states as complex-valued numpy arrays and implements gates as unitary matrices. Gate operations are applied via tensor products and matrix multiplication.

### Supported Gates

Single-qubit gates: Pauli X/Y/Z, Hadamard, Phase, T
Multi-qubit gates: CNOT, CCNOT (Toffoli), SWAP, Controlled-Phase

## Limitations

The simulator is limited to approximately 15 qubits due to exponential memory requirements (2^n complex amplitudes). For larger circuits, tensor network methods would be required.

## Why Archived?

This project served its educational purpose but has been superseded by more full-featured quantum computing frameworks like Qiskit and Cirq. The codebase remains available for reference.
