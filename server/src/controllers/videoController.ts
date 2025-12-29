import { Request, Response } from 'express';
import { Video } from '../models/Video.js';

// Создать новое видео
export const createVideo = async (req: Request, res: Response) => {
  try {
    const { title, url, events } = req.body;
    const video = await Video.create({ title, url, events });
    res.status(201).json(video);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при сохранении видео', error });
  }
};

// Получить список всех видео
export const getAllVideos = async (req: Request, res: Response) => {
  try {
    const videos = await Video.findAll();
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении списка', error });
  }
};