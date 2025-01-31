# Overview Segmentify App

A React-based web application for image segmentation and annotation. This application allows users to load images and create segmented areas with customizable properties, making it ideal for image annotation tasks.

## Features

- Image upload and display
- Interactive canvas for image segmentation
- Customizable annotation tools
- Zoom and pan functionality
- Ant Design UI components for a modern interface
- TypeScript support for better code reliability
- Fabric.js integration for canvas manipulation
- Export to COCO format
- Responsive design

## Technologies Used

- React 18
- TypeScript
- Ant Design (UI Framework)
- Fabric.js (Canvas Library)
- SASS (Styling)
- React Color (Color Picker)
- Phosphor Icons (for hand icon)

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/overview-segmentify-app.git
cd overview-segmentify-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Usage

1. **Launch the Application**
   - Start the development server using `npm start`
   - Open your browser and navigate to `http://localhost:3000`

2. **Working with the App**
   - Upload an image using the upload button
   - Create a segmentation class and choose a unique color and name
   - Use the canvas tools to create and modify segments
   - Use the drawing tools to create segments
   - Adjust colors and properties of segments
   - Save or export your work as needed

## Project Structure

```
overview-segmentify-app/
├── public/              # Static files
├── src/                 # Source files
│   ├── components/     # React components
│   ├── styles/        # SASS styles
│   └── types/         # TypeScript type definitions
├── package.json        # Project dependencies
└── tsconfig.json      # TypeScript configuration
```

## Building for Production

To create a production build:

```bash
npm run build
```

This will create a `build` directory with optimized production files.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Authors

- Larissa Oliveira
