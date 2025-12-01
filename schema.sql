-- Tabela Clientes
CREATE TABLE Clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL UNIQUE
);

-- Tabela Contratos
CREATE TABLE Contratos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    valor_original_disponibilizado DECIMAL(15, 2) NOT NULL,
    data_inicio_contrato DATE NOT NULL,
    taxa_juros_bacen DECIMAL(5, 4) NOT NULL, -- Armazenado como decimal (ex: 0.0350 para 3.5%)
    calcular_restituicao_dobro BOOLEAN NOT NULL DEFAULT 0,
    arquivo_hiscre_path TEXT, -- Caminho ou referência para o arquivo
    FOREIGN KEY (cliente_id) REFERENCES Clientes(id)
);

-- Tabela Pagamentos (Extraída do HISCRE)
CREATE TABLE Pagamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contrato_id INTEGER NOT NULL,
    data_competencia DATE NOT NULL,
    valor_liquido_pago DECIMAL(15, 2) NOT NULL,
    tipo_lancamento TEXT, -- Para filtrar o código 217
    FOREIGN KEY (contrato_id) REFERENCES Contratos(id)
);

-- Tabela Evolução do Saldo (Calculada)
-- Nota: Em uma aplicação real, isso pode ser calculado em tempo de execução,
-- mas aqui está a estrutura para persistência se necessário.
CREATE TABLE EvolucaoSaldo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pagamento_id INTEGER, -- Pode ser nulo se for uma linha de saldo inicial ou apenas juros
    contrato_id INTEGER NOT NULL,
    data_referencia DATE NOT NULL,
    saldo_devedor_anterior DECIMAL(15, 2) NOT NULL,
    juros_calculados DECIMAL(15, 2) NOT NULL,
    amortizacao DECIMAL(15, 2) NOT NULL,
    saldo_devedor_atual DECIMAL(15, 2) NOT NULL,
    valor_restituir_simples DECIMAL(15, 2) DEFAULT 0,
    valor_restituir_atualizado DECIMAL(15, 2) DEFAULT 0,
    FOREIGN KEY (pagamento_id) REFERENCES Pagamentos(id),
    FOREIGN KEY (contrato_id) REFERENCES Contratos(id)
);
