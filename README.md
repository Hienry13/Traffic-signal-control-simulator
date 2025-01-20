# Traffic Signal Control Simulator 🚦

A web-based application that simulates and optimizes traffic signal timing at a four-way intersection using both **fixed-time** and **adaptive** control strategies.

## Overview

This project demonstrates how traffic signal timing affects congestion, vehicle queues, and waiting times. The simulator allows users to input traffic conditions and compare different control modes to evaluate system performance.

## Features

- **Simulation of a four-direction intersection** (North, South, East, West)
- **Fixed-time signal control** — equal green time allocation across all phases
- **Adaptive signal control** — dynamic green time allocation based on traffic volume and queue demand
- **Vehicle queue simulation** with cycle-by-cycle tracking
- **Performance metrics**: average waiting time, throughput, queue length
- **Visual comparison** of control strategies with interactive charts
- **Live traffic light visualization** with animated signal phases
- **Responsive design** — works on desktop, tablet, and mobile

## Technologies Used

- **HTML5** — semantic markup & structure
- **CSS3** — glassmorphism design, animations, responsive layout
- **JavaScript** — simulation engine, DOM manipulation, event handling
- **Chart.js v4** — data visualization (line, bar, radar, doughnut charts)

## How It Works

1. **Configure Traffic Flow** — Enter the number of vehicles per cycle for each direction (North, South, East, West)
2. **Set Simulation Parameters** — Choose the number of cycles and cycle duration
3. **Select Control Mode** — Compare Both strategies, Fixed-Time only, or Adaptive only
4. **Run the Simulation** — Watch the animated traffic light intersection visualize each cycle
5. **Analyze Results** — Review summary metrics, interactive charts, and a detailed cycle-by-cycle table

### Control Strategies

| Strategy       | Description                                                                                                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fixed-Time** | Splits green time equally between NS and EW phases. Each direction gets the same capacity regardless of demand.                                                                     |
| **Adaptive**   | Dynamically allocates green time proportional to current queue sizes. Uses optimized coordination for higher throughput. Heavier directions receive more service within each phase. |

## Purpose

This project is designed for educational and demonstration purposes, showcasing basic concepts of intelligent transportation systems and traffic signal optimization.

## How to Run

1. Download or clone the repository
2. Open `index.html` in any modern web browser
3. Enter traffic parameters and click **Run Simulation**
