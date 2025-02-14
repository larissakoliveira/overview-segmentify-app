// Predefined metadata to meet the requirements of the Python API tests
export const appMetadata = {
  description: "Semantic Segmentation Dataset",
  url: "http://example.com",
  version: "1.0",
  year: new Date().getFullYear(),
  contributor: "Your Name/Organization",
  date_created: new Date().toISOString(),
  licenses: [
    {
      id: 1,
      name: "Creative Commons Attribution 4.0 License",
      url: "https://creativecommons.org/licenses/by/4.0/",
    },
  ],
  coco_url: "http://example.com/images/{fileName}",
  flickr_url: "http://example.com/images/{fileName}",
};
