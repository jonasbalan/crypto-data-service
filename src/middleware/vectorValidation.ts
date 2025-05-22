import { Request, Response, NextFunction } from 'express';
import { VectorInsertRequest, VectorSearchRequest } from '../types/vector';
import Joi from 'joi';

const vectorSchema = Joi.object({
  data: Joi.array().items(
    Joi.object({
      symbol: Joi.string().required(),
      timestamp: Joi.number().required(),
      price: Joi.number().required(),
      volume: Joi.number().required()
    })
  ).required()
});

const searchSchema = Joi.object({
  vector: Joi.array().items(Joi.number()).required(),
  limit: Joi.number().min(1).max(100).default(10)
});

export const validateVectorInsert = (req: Request, res: Response, next: NextFunction): void => {
  const { vectors, metadata }: VectorInsertRequest = req.body;

  if (!vectors || !Array.isArray(vectors) || vectors.length === 0) {
    res.status(400).json({ error: 'Vetores inválidos' });
    return;
  }

  if (!metadata || !Array.isArray(metadata) || metadata.length !== vectors.length) {
    res.status(400).json({ error: 'Metadados inválidos' });
    return;
  }

  const isValidVector = vectors.every(vector => 
    Array.isArray(vector) && 
    vector.every(value => typeof value === 'number')
  );

  if (!isValidVector) {
    res.status(400).json({ error: 'Formato de vetor inválido' });
    return;
  }

  const isValidMetadata = metadata.every(meta => 
    meta && 
    typeof meta === 'object' && 
    typeof meta.symbol === 'string' &&
    typeof meta.timestamp === 'number' &&
    typeof meta.price === 'number' &&
    typeof meta.volume === 'number'
  );

  if (!isValidMetadata) {
    res.status(400).json({ error: 'Formato de metadados inválido' });
    return;
  }

  next();
};

export const validateVectorData = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = vectorSchema.validate(req.body);
  if (error) {
    res.status(400).json({ error: error.details[0].message });
    return;
  }
  next();
};

export const validateVectorSearch = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = searchSchema.validate(req.body);
  if (error) {
    res.status(400).json({ error: error.details[0].message });
    return;
  }
  next();
}; 