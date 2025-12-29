import axios from 'axios';

const API_URL = 'http://localhost:5000/api/videos';

export const getVideos = async () => {
  try {
    const response = await axios.get(API_URL);
    return response.data;
  } catch (error) {
    console.error("Ошибка при получении видео:", error);
    return [];
  }
};

// ДОБАВЬ ЭТОТ БЛОК:
export const createVideo = async (videoData: any) => {
  try {
    const response = await axios.post(API_URL, videoData);
    return response.data;
  } catch (error) {
    console.error("Ошибка при создании видео:", error);
    throw error;
  }
};
export const uploadVideoFile = async (file: File) => {
  const formData = new FormData();
  formData.append('video', file);

  const response = await axios.post('http://localhost:5000/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data; // Вернет { url: "..." }
};