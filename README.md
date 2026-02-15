# SmartH2wo: IoT-Based Smart Water Dispenser

![Status](https://img.shields.io/badge/Status-Prototype_Development-orange)
![Platform](https://img.shields.io/badge/Platform-ESP32-blue,https://img.shields.io/badge/Arduino-00878F?logo=arduino&logoColor=fff&style=plastic)

An IoT-based water dispenser prototype developed for the **PUP ITECH** campus. This project integrates hardware sensors with machine learning to provide real-time monitoring and predictive maintenance.

## 🚀 Features
* **Predictive Maintenance:** Uses Machine Learning models to detect potential pump failures or filter clogs before they occur.
* **Real-time Dashboard:** A full-stack web interface to monitor water levels, temperature, and usage statistics.
* **Remote Management:** Built with an ESP32 for wireless data transmission to a central database.

## 🛠️ Technical Stack
* **Hardware:** ESP32, Flow Sensors, Ultrasonic Sensors.
* **PCB Design:** Schematic capture and layout designed using **KiCad**.
* **Backend:** Node.js, PHP.
* **Database:** MySQL for high-concurrency data logging.
* **Frontend:** React-based dashboard for real-time data visualization.

## 📂 Project Structure
* `/firmware`: C++ code for ESP32 logic.
* `/web-app`: Dashboard source code (PHP/React).
* `/hardware`: KiCad project files and BOM.
