# SmartH2wo: IoT-Based Smart Water Dispenser with Predictive Maintenance using Machine Learning

![Status](https://img.shields.io/badge/Status-Prototype_Development-orange)
![Platform](https://img.shields.io/badge/Platform-ESP32-blue)
![Ecosystem](https://img.shields.io/badge/Framework-Arduino-00979D?logo=arduino&logoColor=white)
![ML](https://img.shields.io/badge/Focus-Machine_Learning-FF6F00?logo=tensorflow&logoColor=white)

An IoT-based water dispenser prototype developed for the **PUP ITECH** campus. This project integrates hardware sensors with machine learning to provide real-time monitoring and predictive maintenance.

## 🚀 Features
* **Predictive Maintenance:** Uses Machine Learning models to detect potential pump failures or filter clogs before they occur.
* **Real-time Dashboard:** A full-stack web interface to monitor water levels, temperature, and usage statistics.
* **Remote Management:** Built with an ESP32 for wireless data transmission to a central database.

## 🤖 Machine Learning & Predictive Maintenance
The core innovation of this project is the shift from reactive to proactive maintenance:
* **Life-Cycle Modeling:** Trained on historical usage data to predict when filters require replacement, reducing downtime on campus.
* **Edge Intelligence:** Lightweight inference logic processes critical sensor triggers directly on the ESP32 via the Arduino framework.



## 🛠️ Technical Stack
* **Development:** ![Arduino](https://img.shields.io/badge/-Arduino-00979D?style=flat-square&logo=Arduino&logoColor=white) 
* **Hardware:** ESP32, Flow Sensors, Ultrasonic Sensors.
* **PCB Design:** Schematic capture and layout designed using **KiCad**.
* **Backend:** Node.js, PHP.
* **Database:** MySQL for high-concurrency data logging.
* **Frontend:** React-based dashboard for real-time data visualization.

## 📂 Project Structure
* `/firmware`: C++ code for ESP32 logic (Arduino Framework).
* `/ml-models`: Python scripts for training failure detection models.
* `/web-app`: Dashboard source code (PHP/React).
