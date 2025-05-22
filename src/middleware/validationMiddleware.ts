import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Validador para símbolos de criptomoedas
 */
export const validateSymbol = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    symbol: Joi.string().trim().min(1).max(10).required()
      .pattern(/^[A-Za-z0-9]+$/)
      .messages({
        'string.empty': 'Símbolo não pode ser vazio',
        'string.min': 'Símbolo deve ter pelo menos 1 caractere',
        'string.max': 'Símbolo deve ter no máximo 10 caracteres',
        'string.pattern.base': 'Símbolo deve conter apenas letras e números'
      })
  });

  const { error } = schema.validate({ symbol: req.params.symbol });
  
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  
  // Converter para maiúscula
  req.params.symbol = req.params.symbol.toUpperCase();
  
  next();
};

/**
 * Validador para parâmetros de paginação
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  });

  const { error, value } = schema.validate(req.query);
  
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  
  // Atualizar query com valores validados e valores padrão
  req.query.page = value.page.toString();
  req.query.limit = value.limit.toString();
  
  next();
};

/**
 * Validador para timeframes de dados históricos
 */
export const validateTimeframe = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    timeframe: Joi.string().valid('1h', '4h', '1d', '1w').default('1d')
  });

  const { error, value } = schema.validate(req.query);
  
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  
  // Atualizar query com valor validado
  req.query.timeframe = value.timeframe;
  
  next();
}; 