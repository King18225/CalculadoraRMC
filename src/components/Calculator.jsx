import React, { useState, useEffect } from 'react';
import { Calculator, Upload, FileText, DollarSign, Calendar, Percent, User, CreditCard, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Força o uso do Worker via CDN para evitar erros de caminho local
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function CalculatorComponent() {
    const [client, setClient] = useState({ nome: '', cpf: '' });
    const [contract, setContract] = useState({
        valorOriginal: '',
        dataInicio: '',
        taxaJuros: '',
        restituicaoDobro: false
    });
    const [payments, setPayments] = useState([]);
    const [evolution, setEvolution] = useState([]);
    const [summary, setSummary] = useState({
        totalPago: 0,
        saldoDevedorAtual: 0,
        valorRestituir: 0
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [debugText, setDebugText] = useState('');

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsProcessing(true);
        setUploadError(null);
        setPayments([]);
        setDebugText('');

        try {
            let textContent = '';

            if (file.type === 'application/pdf') {
                // Create a URL for the file to avoid array buffer issues
                const url = URL.createObjectURL(file);
                const loadingTask = pdfjsLib.getDocument(url);
                const pdf = await loadingTask.promise;

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContentItem = await page.getTextContent();
                    // Join items with a newline to prevent table columns from merging
                    const pageText = textContentItem.items.map(item => item.str + '\n').join('');
                    textContent += pageText + '\n';
                }

                // Clean up
                URL.revokeObjectURL(url);
            } else {
                // Assume text file
                textContent = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = (e) => reject(e);
                    reader.readAsText(file);
                });
            }

            setDebugText(textContent);
            parseContent(textContent);
        } catch (error) {
            console.error('Error processing file:', error);
            const errorMsg = 'Erro técnico no PDF: ' + error.message;
            window.alert(errorMsg);
            setUploadError(errorMsg);
        } finally {
            setIsProcessing(false);
        }
    };

    const parseContent = (text) => {
        const lines = text.split(/\r?\n/);
        const extractedPayments = [];
        let idCounter = 1;
        let currentCompetenceDate = null;

        // Regex patterns
        // Date: MM/YYYY (e.g., 07/2020) - relaxed to just find the pattern
        const competenceRegex = /(\d{2}\/\d{4})/;
        // Value: 1.234,56 or 123,45 (captures the value at the end or middle of line)
        const valueRegex = /(\d{1,3}(?:\.\d{3})*,\d{2})/;

        lines.forEach(line => {
            const trimmedLine = line.trim();

            // 1. Detect Header/Competence Date
            // Relaxed logic: If line starts with MM/YYYY, assume it's a competence date
            // Also keep checking for "Competência" just in case, but prioritize the simple date pattern
            if (/^\d{2}\/\d{4}/.test(trimmedLine) || (trimmedLine.includes('/') && trimmedLine.includes('Competência'))) {
                const dateMatch = trimmedLine.match(competenceRegex);
                if (dateMatch) {
                    const [month, year] = dateMatch[1].split('/');
                    // Set to the first day of the month for consistency
                    currentCompetenceDate = `${year}-${month}-01`;
                }
            }

            // 2. Detect Payment
            if (trimmedLine.includes('217') || trimmedLine.includes('EMPRESTIMO SOBRE A RMC')) {
                if (currentCompetenceDate) {
                    const valueMatch = trimmedLine.match(valueRegex);

                    if (valueMatch) {
                        // Parse value to float (remove dots, replace comma with dot)
                        const valueStr = valueMatch[1].replace(/\./g, '').replace(',', '.');
                        const value = parseFloat(valueStr);

                        extractedPayments.push({
                            id: idCounter++,
                            dataCompetencia: currentCompetenceDate,
                            valorLiquido: value.toFixed(2),
                            tipoLancamento: 'Pagamento (Extraído)',
                            originalLine: trimmedLine
                        });
                    }
                }
            }
        });

        if (extractedPayments.length === 0) {
            setUploadError('Nenhum pagamento encontrado. Verifique o texto extraído abaixo para depuração.');
        } else {
            setPayments(extractedPayments);
        }
    };

    const calculate = () => {
        if (!contract.valorOriginal || !contract.taxaJuros || payments.length === 0) {
            alert('Por favor, preencha os dados do contrato e carregue os pagamentos.');
            return;
        }

        let saldo = parseFloat(contract.valorOriginal);
        const taxa = parseFloat(contract.taxaJuros) / 100;
        const newEvolution = [];
        let totalPago = 0;
        let totalRestituir = 0;

        // Sort payments by date
        const sortedPayments = [...payments].sort((a, b) => new Date(a.dataCompetencia) - new Date(b.dataCompetencia));

        sortedPayments.forEach((payment) => {
            const valorPago = parseFloat(payment.valorLiquido);
            totalPago += valorPago;

            const saldoAnterior = saldo;

            // Juros do Mês = Saldo Anterior * Taxa
            // Se Saldo Anterior < 0, Juros também serão negativos (crédito)
            const juros = saldoAnterior * taxa;

            // Amortização = Pagamento - Juros do Mês
            const amortizacao = valorPago - juros;

            // Saldo Devedor Atual = Saldo Anterior - Amortização
            saldo = saldoAnterior - amortizacao;

            // Cálculo da Restituição (Indébito)
            let baseRestituicao = 0;

            if (saldoAnterior > 0) {
                // Se (Saldo Anterior > 0), então (Pagamento - (Juros + Amortização necessária para zerar))
                // Amortização necessária para zerar é o próprio Saldo Anterior.
                // Então: Pagamento - (Juros + Saldo Anterior)
                // Se o resultado for negativo, significa que não houve pagamento em excesso suficiente para gerar restituição neste mês.
                const excesso = valorPago - (juros + saldoAnterior);
                baseRestituicao = excesso > 0 ? excesso : 0;
            } else {
                // senão (Pagamento + Juros a favor do cliente)
                // Juros aqui é negativo, então usamos Math.abs(juros) para somar "a favor"
                baseRestituicao = valorPago + Math.abs(juros);
            }

            // Regra do Dobro
            let valorRestituirAtualizado = baseRestituicao;
            const dataPagamento = new Date(payment.dataCompetencia);
            const dataCorte = new Date('2021-03-30');

            if (contract.restituicaoDobro && dataPagamento > dataCorte) {
                valorRestituirAtualizado = baseRestituicao * 2;
            }

            totalRestituir += valorRestituirAtualizado;

            newEvolution.push({
                id: payment.id,
                dataReferencia: payment.dataCompetencia,
                saldoAnterior,
                juros,
                amortizacao,
                saldoAtual: saldo,
                valorPago,
                valorRestituir: valorRestituirAtualizado
            });
        });

        setEvolution(newEvolution);

        setSummary({
            totalPago,
            saldoDevedorAtual: saldo > 0 ? saldo : 0,
            valorRestituir: totalRestituir
        });
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    return (
        <div className="container">
            <div className="header">
                <h1>Calculadora RMC</h1>
                <p>Recálculo de Dívidas de Cartão de Crédito Consignado</p>
            </div>

            <div className="card">
                <div className="header" style={{ textAlign: 'left', marginBottom: '1rem' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem' }}>
                        <User className="icon" /> Dados do Cliente
                    </h2>
                </div>
                <div className="form-grid">
                    <div className="form-group">
                        <label>Nome Completo</label>
                        <input
                            type="text"
                            value={client.nome}
                            onChange={(e) => setClient({ ...client, nome: e.target.value })}
                            placeholder="Ex: João da Silva"
                        />
                    </div>
                    <div className="form-group">
                        <label>CPF</label>
                        <input
                            type="text"
                            value={client.cpf}
                            onChange={(e) => setClient({ ...client, cpf: e.target.value })}
                            placeholder="000.000.000-00"
                        />
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="header" style={{ textAlign: 'left', marginBottom: '1rem' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem' }}>
                        <FileText className="icon" /> Dados do Contrato
                    </h2>
                </div>
                <div className="form-grid">
                    <div className="form-group">
                        <label>Valor Original Disponibilizado</label>
                        <div style={{ position: 'relative' }}>
                            <DollarSign className="icon" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                            <input
                                type="number"
                                style={{ paddingLeft: '2.5rem' }}
                                value={contract.valorOriginal}
                                onChange={(e) => setContract({ ...contract, valorOriginal: e.target.value })}
                                placeholder="0,00"
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Data de Início</label>
                        <div style={{ position: 'relative' }}>
                            <Calendar className="icon" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                            <input
                                type="date"
                                style={{ paddingLeft: '2.5rem' }}
                                value={contract.dataInicio}
                                onChange={(e) => setContract({ ...contract, dataInicio: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Taxa de Juros BACEN (%)</label>
                        <div style={{ position: 'relative' }}>
                            <Percent className="icon" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                            <input
                                type="number"
                                step="0.01"
                                style={{ paddingLeft: '2.5rem' }}
                                value={contract.taxaJuros}
                                onChange={(e) => setContract({ ...contract, taxaJuros: e.target.value })}
                                placeholder="Ex: 3.5"
                            />
                        </div>
                    </div>
                    <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                style={{ width: 'auto' }}
                                checked={contract.restituicaoDobro}
                                onChange={(e) => setContract({ ...contract, restituicaoDobro: e.target.checked })}
                            />
                            Calcular Restituição em Dobro?
                        </label>
                    </div>
                </div>

                <div className="form-group">
                    <label>Arquivo HISCRE (PDF ou TXT)</label>
                    <div className={`file-upload ${isProcessing ? 'processing' : ''}`}>
                        <input
                            type="file"
                            id="hiscre-upload"
                            style={{ display: 'none' }}
                            onChange={handleFileUpload}
                            accept=".csv,.txt,.pdf"
                            disabled={isProcessing}
                        />
                        <label htmlFor="hiscre-upload" style={{ cursor: isProcessing ? 'wait' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            {isProcessing ? (
                                <RefreshCw className="icon spin" style={{ width: '2rem', height: '2rem', color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
                            ) : (
                                <Upload className="icon" style={{ width: '2rem', height: '2rem', color: 'var(--primary)' }} />
                            )}
                            <span style={{ color: 'var(--primary)', fontWeight: '600' }}>
                                {isProcessing ? 'Processando arquivo...' : 'Clique para fazer upload'}
                            </span>
                            <span style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>
                                Busca automática por "217" ou "EMPRESTIMO SOBRE A RMC"
                            </span>
                        </label>
                    </div>

                    {uploadError && (
                        <div style={{ marginTop: '1rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertCircle className="icon" /> {uploadError}
                        </div>
                    )}

                    {payments.length > 0 && (
                        <div style={{ marginTop: '1rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckCircle className="icon" /> {payments.length} pagamentos extraídos com sucesso!
                        </div>
                    )}

                    <div style={{ marginTop: '1rem' }}>
                        <label style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>Texto Extraído (Debug)</label>
                        <textarea
                            value={debugText}
                            readOnly
                            style={{ width: '100%', height: '150px', marginTop: '0.5rem', padding: '0.5rem', fontSize: '0.8rem', fontFamily: 'monospace', border: '1px solid var(--border)', borderRadius: '0.5rem' }}
                            placeholder="O texto extraído do arquivo aparecerá aqui..."
                        />
                    </div>
                </div>

                <div style={{ marginTop: '2rem', textAlign: 'right' }}>
                    <button className="btn btn-primary" onClick={calculate}>
                        <Calculator className="icon" /> Calcular Evolução
                    </button>
                </div>
            </div>

            {evolution.length > 0 && (
                <>
                    <div className="summary-cards">
                        <div className="summary-card">
                            <h3>Total Pago</h3>
                            <div className="value">{formatCurrency(summary.totalPago)}</div>
                        </div>
                        <div className="summary-card">
                            <h3>Saldo Devedor Atual (Recalculado)</h3>
                            <div className="value">{formatCurrency(summary.saldoDevedorAtual)}</div>
                        </div>
                        <div className={`summary-card ${summary.valorRestituir > 0 ? 'highlight' : ''}`}>
                            <h3>Valor a Restituir {contract.restituicaoDobro ? '(Em Dobro)' : ''}</h3>
                            <div className="value">{formatCurrency(summary.valorRestituir)}</div>
                        </div>
                    </div>

                    <div className="card" style={{ marginTop: '2rem' }}>
                        <div className="header" style={{ textAlign: 'left', marginBottom: '1rem' }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem' }}>
                                <RefreshCw className="icon" /> Evolução do Saldo
                            </h2>
                        </div>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Saldo Anterior</th>
                                        <th>Juros</th>
                                        <th>Valor Pago</th>
                                        <th>Amortização</th>
                                        <th>Saldo Atual</th>
                                        <th>Valor a Restituir</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {evolution.map((row) => (
                                        <tr key={row.id}>
                                            <td>{formatDate(row.dataReferencia)}</td>
                                            <td>{formatCurrency(row.saldoAnterior)}</td>
                                            <td style={{ color: 'var(--danger)' }}>+ {formatCurrency(row.juros)}</td>
                                            <td style={{ color: 'var(--success)' }}>- {formatCurrency(row.valorPago)}</td>
                                            <td style={{ color: row.amortizacao > 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                {formatCurrency(row.amortizacao)}
                                            </td>
                                            <td style={{ fontWeight: 'bold' }}>{formatCurrency(row.saldoAtual)}</td>
                                            <td style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{formatCurrency(row.valorRestituir)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
