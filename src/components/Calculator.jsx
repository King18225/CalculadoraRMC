import React, { useState, useEffect } from 'react';
import { Calculator, Upload, FileText, DollarSign, Calendar, Percent, User, RefreshCw, CheckCircle, AlertCircle, Printer, HelpCircle, File } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { BlobProvider } from '@react-pdf/renderer';
import { ReportPDF } from './ReportPDF';

// Configuração do Worker (Mantida do UNPKG para evitar erros 404)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export default function CalculatorDashboard() {
    // --- ESTADOS ---
    const [client, setClient] = useState({ nome: '', cpf: '' });
    const [contract, setContract] = useState({
        valorOriginal: '',
        dataInicio: '',
        valorParcela: '',
        qtdParcelas: '',
        taxaJuros: '',
        restituicaoDobro: false
    });
    const [payments, setPayments] = useState([]);
    const [evolution, setEvolution] = useState([]);
    const [summary, setSummary] = useState({ totalPago: 0, saldoDevedorAtual: 0, valorRestituir: 0 });

    // Controles de UI
    const [isProcessing, setIsProcessing] = useState(false);
    const [isFetchingRate, setIsFetchingRate] = useState(false);
    const [progressStatus, setProgressStatus] = useState('');
    const [uploadError, setUploadError] = useState(null);
    const [debugText, setDebugText] = useState('');
    const [fileName, setFileName] = useState(null);

    // --- HELPER: FORMATAÇÃO MONETÁRIA (BRL) ---
    const formatCurrencyInput = (value) => {
        if (!value) return "";
        // Remove tudo que não é dígito
        const onlyDigits = value.replace(/\D/g, "");
        if (!onlyDigits) return "";

        // Converte para centavos e formata
        const numberValue = Number(onlyDigits) / 100;
        return numberValue.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    };

    // --- HELPER: PARSE PARA CÁLCULO ---
    const parseCurrencyToFloat = (valueStr) => {
        if (!valueStr) return 0;
        if (typeof valueStr === 'number') return valueStr;
        // Remove caracteres não numéricos exceto vírgula e ponto (mas ponto é milhar em BRL)
        // Remove o símbolo R$, espaços e pontos de milhar
        const cleanStr = valueStr.replace(/[R$\s.]/g, '').replace(',', '.');
        return parseFloat(cleanStr);
    };

    // --- NOVO HANDLE CHANGE PARA INPUTS ---
    const handleMoneyChange = (field, value) => {
        const formatted = formatCurrencyInput(value);
        setContract(prev => ({ ...prev, [field]: formatted }));
    };

    // --- 1. INTEGRAÇÃO BACEN ---
    useEffect(() => {
        const fetchBacenRate = async () => {
            if (!contract.dataInicio) return;
            if (contract.dataInicio.length !== 10) return;

            setIsFetchingRate(true);
            try {
                const [year, month, day] = contract.dataInicio.split('-');
                const formattedDate = `${day}/${month}/${year}`;

                const response = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.25468/dados?formato=json&dataInicial=${formattedDate}&dataFinal=${formattedDate}`);
                const data = await response.json();

                if (data && data.length > 0) {
                    const rate = data[0].valor;
                    setContract(prev => ({ ...prev, taxaJuros: rate.replace(',', '.') }));
                } else {
                    const fallbackDate = `01/${month}/${year}`;
                    const respFallback = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.25468/dados?formato=json&dataInicial=${fallbackDate}&dataFinal=${fallbackDate}`);
                    const dataFallback = await respFallback.json();

                    if (dataFallback && dataFallback.length > 0) {
                        setContract(prev => ({ ...prev, taxaJuros: dataFallback[0].valor.replace(',', '.') }));
                    }
                }
            } catch (error) {
                console.error("Erro ao buscar taxa BACEN:", error);
            } finally {
                setIsFetchingRate(false);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchBacenRate();
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [contract.dataInicio]);

    // --- 2. LÓGICA DE UPLOAD E OCR ---
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileName(file.name);
        setIsProcessing(true);
        setUploadError(null);
        setPayments([]);
        setDebugText('');
        setProgressStatus('Iniciando leitura...');

        try {
            let fullTextContent = '';
            if (file.type === 'application/pdf') {
                const url = URL.createObjectURL(file);
                const loadingTask = pdfjsLib.getDocument(url);
                const pdf = await loadingTask.promise;
                const numPages = pdf.numPages;

                for (let i = 1; i <= numPages; i++) {
                    setProgressStatus(`Lendo pág ${i}/${numPages}...`);
                    const page = await pdf.getPage(i);
                    const textContentItem = await page.getTextContent();
                    let pageText = textContentItem.items.map(item => item.str).join(' ');

                    if (pageText.trim().length < 50) {
                        setProgressStatus(`Pág ${i}: Imagem detectada. Aplicando OCR...`);
                        const viewport = page.getViewport({ scale: 2.0 });
                        const canvas = document.createElement('canvas');
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        const context = canvas.getContext('2d');
                        await page.render({ canvasContext: context, viewport: viewport }).promise;

                        const { data: { text } } = await Tesseract.recognize(canvas, 'por');
                        pageText = text;
                    }
                    fullTextContent += `\n--- [Pág ${i}] ---\n` + pageText;
                }
                URL.revokeObjectURL(url);
            } else {
                fullTextContent = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = (e) => reject(e);
                    reader.readAsText(file);
                });
            }
            setDebugText(fullTextContent);
            parseContent(fullTextContent);
        } catch (error) {
            console.error(error);
            setUploadError('Erro técnico: ' + error.message);
        } finally {
            setIsProcessing(false);
            setProgressStatus('');
        }
    };

    // --- 3. LÓGICA DE PARSE INTELIGENTE (Hierarquia: Kill-Switch > Imunidade 217 > Filtros Genéricos) ---
    const parseContent = (text) => {
        const lines = text.split(/\r?\n/);
        const extractedPayments = [];

        let idCounter = 1;
        let currentCompetenceDate = null;

        // Regex poderosa para datas (DD/MM/AAAA ou MM/AAAA)
        const competenceRegex = /(\d{1,2}\s*[\/\.]\s*\d{4})/;
        const valueRegex = /(\d{1,3}(?:\.\d{3})*,\d{2})/;

        lines.forEach(line => {
            const rawLine = line.trim();
            if (!rawLine) return;

            // 1. SANITIZAÇÃO DE CARACTERES
            let cleanLine = rawLine.toUpperCase();
            cleanLine = cleanLine.replace(/([0-9\/\s])O([0-9\/\s])/g, '$10$2');
            cleanLine = cleanLine.replace(/([0-9\/\s])[Il]([0-9\/\s])/g, '$11$2');
            cleanLine = cleanLine.replace(/\s+/g, ' ');

            // 2. BLOQUEIO DE CABEÇALHOS E DATAS DE IMPRESSÃO (CRÍTICO)
            const isInvalidLine =
                cleanLine.includes('INICIAL') ||
                cleanLine.includes('FINAL') ||
                cleanLine.includes('INICIO') ||
                cleanLine.includes('CONCESSAO') ||
                cleanLine.includes('NASCIMENTO') ||
                cleanLine.includes('DATA') ||
                cleanLine.includes('BENEFICIO') ||
                cleanLine.includes('MARGEM') ||
                cleanLine.includes('RESERVADA') ||
                cleanLine.includes('216') ||
                cleanLine.includes('CONSIGNACAO EMPRESTIMO') ||
                cleanLine.includes('PAGINA') ||
                cleanLine.includes('INSTITUTO') ||
                cleanLine.includes('PREVIDENCIA') ||
                cleanLine.includes('HISTORICO') ||
                cleanLine.includes('GERADO') ||
                /\d{2}:\d{2}/.test(cleanLine); // Bloqueia horário (ex: 21:39:18)

            // 3. TENTA LER DATA VÁLIDA NA LINHA
            // Só aceita data se NÃO for linha inválida
            if (!isInvalidLine && competenceRegex.test(cleanLine)) {
                const dateMatch = cleanLine.match(competenceRegex);
                if (dateMatch) {
                    const dateStr = dateMatch[1].replace(/\s/g, '').replace(/\./g, '/');
                    const parts = dateStr.split('/');
                    let month, year;

                    // Suporte a DD/MM/AAAA e MM/AAAA
                    if (parts.length === 3) { month = parts[1]; year = parts[2]; }
                    else if (parts.length === 2) { month = parts[0]; year = parts[1]; }

                    if (month && year) {
                        const y = parseInt(year);
                        // Filtro de ano estrito para evitar pegar ano de nascimento ou futuro
                        if (y >= 2000 && y <= 2030) {
                            currentCompetenceDate = `${year}-${month.padStart(2, '0')}-01`;
                        }
                    }
                }
            }

            // 4. EXTRAÇÃO DO VALOR (Filtro 217)
            const hasCode217 = cleanLine.includes('217');
            const hasRMC = cleanLine.includes('RMC');

            if ((hasCode217 || hasRMC) && !isInvalidLine) {
                const valueMatch = cleanLine.match(valueRegex);

                if (valueMatch) {
                    const rawValue = valueMatch[1].replace(/[^\d,]/g, '');
                    const value = parseFloat(rawValue.replace(',', '.'));

                    if (!isNaN(value) && value > 10 && value < 10000) {
                        // ADICIONA À LISTA
                        // Se currentCompetenceDate for null (órfão), será corrigido depois
                        extractedPayments.push({
                            id: idCounter++,
                            dataCompetencia: currentCompetenceDate,
                            valorLiquido: value.toFixed(2),
                            originalLine: cleanLine
                        });
                    }
                }
            }
        });

        if (extractedPayments.length > 0) {
            // --- 5. INTERPOLAÇÃO INTELIGENTE (CORREÇÃO DE GAPS) ---

            // Passo A: Remove duplicatas EXATAS de leitura (mesma linha lida 2x na quebra de pág)
            // Usa um Map para manter apenas a última ocorrência ou primeira (tanto faz se forem iguais)
            // Mas cuidado: valores iguais em meses diferentes DEVEM ficar.
            // A chave deve ser apenas o índice se não tiver data, então pulamos isso por enquanto e confiamos na interpolação.

            // Passo B: Acha a primeira data firme
            let firstValidIndex = extractedPayments.findIndex(p => p.dataCompetencia !== null);

            if (firstValidIndex === -1) {
                // Se tudo falhar, assume data de hoje retroativa
                const today = new Date();
                firstValidIndex = extractedPayments.length - 1;
                const isoToday = today.toISOString().split('T')[0].substring(0, 8) + '01';
                extractedPayments[firstValidIndex].dataCompetencia = isoToday;
            }

            // Passo C: Backfill (Preenche para trás)
            for (let i = firstValidIndex - 1; i >= 0; i--) {
                const nextDate = new Date(extractedPayments[i + 1].dataCompetencia);
                nextDate.setMonth(nextDate.getMonth() - 1); // -1 mês
                const isoDate = new Date(nextDate.valueOf() + nextDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                extractedPayments[i].dataCompetencia = isoDate.substring(0, 8) + '01';
            }

            // Passo D: Forward Fill (Preenche para frente)
            for (let i = firstValidIndex + 1; i < extractedPayments.length; i++) {
                // Se a data for nula OU se for igual à anterior (erro de data grudenta), forçamos o próximo mês
                // Isso resolve o problema de datas repetidas e gaps
                const prevDate = new Date(extractedPayments[i - 1].dataCompetencia);
                const currDate = extractedPayments[i].dataCompetencia ? new Date(extractedPayments[i].dataCompetencia) : null;

                // Se não tem data, ou se a data é igual/menor que a anterior (impossível em RMC), corrige
                if (!currDate || currDate <= prevDate) {
                    const newDate = new Date(prevDate);
                    newDate.setMonth(newDate.getMonth() + 1); // +1 mês
                    const isoDate = new Date(newDate.valueOf() + newDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                    extractedPayments[i].dataCompetencia = isoDate.substring(0, 8) + '01';
                }
            }

            // Ordena e Salva
            extractedPayments.sort((a, b) => new Date(a.dataCompetencia) - new Date(b.dataCompetencia));
            setPayments(extractedPayments);

            // Define contrato com primeiro valor
            const firstValue = extractedPayments.length > 0 ? extractedPayments[0].valorLiquido : '';
            setContract(prev => ({ ...prev, qtdParcelas: extractedPayments.length, valorParcela: firstValue }));

            setUploadError(null);
        } else {
            setUploadError('Nenhum pagamento 217 encontrado.');
        }
    };

    const calculate = () => {
        // 1. Sanitiza os INPUTS do usuário (que estão em formato BRL visual: "3.401,00")
        const valorOriginal = parseCurrencyToFloat(contract.valorOriginal);

        // Se a taxa vier do input visual, sanitiza. Se vier da API (number), mantém.
        let taxaVal = contract.taxaJuros;
        if (typeof taxaVal === 'string') {
            taxaVal = taxaVal.replace(',', '.');
        }
        const taxa = parseFloat(taxaVal) / 100;

        // Validação
        if (!valorOriginal || valorOriginal <= 0) {
            alert('Por favor, informe o Valor do Empréstimo (Valor Original) corretamente.');
            return;
        }

        if (payments.length === 0) {
            alert('Nenhum pagamento carregado.');
            return;
        }

        let saldo = valorOriginal;
        const newEvolution = [];
        let totalPago = 0;

        // Ordena Cronologicamente
        const sortedPayments = [...payments].sort((a, b) => new Date(a.dataCompetencia) - new Date(b.dataCompetencia));

        sortedPayments.forEach((payment) => {
            // --- CORREÇÃO CRÍTICA AQUI ---
            // O valorLiquido vem do OCR como "112.35" (formato JS padrão). 
            // NÃO usar parseCurrencyToFloat aqui, pois ele remove o ponto achando que é milhar.
            const valorPago = parseFloat(payment.valorLiquido);
            // -----------------------------

            totalPago += valorPago;

            const saldoAnterior = saldo;
            const juros = saldoAnterior * taxa;
            const amortizacao = valorPago - juros;

            saldo = saldoAnterior - amortizacao;

            // Lógica de Restituição (Dobra)
            let baseRestituicao = 0;
            if (saldoAnterior < 0) {
                baseRestituicao = valorPago;
            } else if (saldo < 0 && saldoAnterior > 0) {
                baseRestituicao = Math.abs(saldo);
            }

            let valorRestituirMes = 0;
            const dataPagamento = new Date(payment.dataCompetencia);
            const dataCorte = new Date('2021-03-30');

            if (contract.restituicaoDobro && dataPagamento > dataCorte && baseRestituicao > 0) {
                valorRestituirMes = baseRestituicao;
            }

            newEvolution.push({
                id: payment.id,
                dataReferencia: payment.dataCompetencia,
                saldoAnterior,
                juros,
                amortizacao,
                saldoAtual: saldo,
                valorPago,
                valorRestituir: valorRestituirMes
            });
        });

        // Totais Finais
        const saldoFinal = saldo;
        const totalDobras = newEvolution.reduce((acc, cur) => acc + cur.valorRestituir, 0);

        // Se saldo final é negativo (credor), o cliente recebe o valor absoluto + as dobras
        let valorFinalRestituir = 0;
        if (saldoFinal < 0) {
            valorFinalRestituir = Math.abs(saldoFinal) + totalDobras;
        }

        setEvolution(newEvolution);
        setSummary({
            totalPago,
            saldoDevedorAtual: saldoFinal > 0 ? saldoFinal : 0,
            valorRestituir: valorFinalRestituir
        });
    };

    const fmtBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    const fmtDate = (d) => { const dt = new Date(d); return new Date(dt.valueOf() + dt.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR'); };

    return (
        <div className="dashboard-wrapper">
            <div className="dashboard-container">
                <h1 className="main-title">Dados para Análise</h1>

                <section className="form-section">
                    <h3 className="section-title">Informações do Cliente</h3>
                    <div className="form-row-2">
                        <div className="input-group">
                            <label>Nome do Cliente/Autor</label>
                            <div className="input-icon-wrapper"><User className="input-icon" /><input type="text" value={client.nome} onChange={e => setClient({ ...client, nome: e.target.value })} /></div>
                        </div>
                        <div className="input-group">
                            <label>Nº CPF</label>
                            <input type="text" value={client.cpf} onChange={e => setClient({ ...client, cpf: e.target.value })} />
                        </div>
                    </div>
                </section>

                <section className="form-section">
                    <h3 className="section-title">Informações do Contrato</h3>
                    <div className="form-row-2">
                        <div className="input-group">
                            <label>Valor do Empréstimo Disponibilizado (R$)</label>
                            <div className="input-icon-wrapper">
                                <DollarSign className="input-icon" />
                                <input
                                    type="text"
                                    placeholder="R$ 0,00"
                                    value={contract.valorOriginal}
                                    onChange={e => handleMoneyChange('valorOriginal', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Data do Contrato</label>
                            <div className="input-icon-wrapper"><Calendar className="input-icon" /><input type="date" value={contract.dataInicio} onChange={e => setContract({ ...contract, dataInicio: e.target.value })} /></div>
                        </div>
                    </div>
                    <div className="form-row-2">
                        <div className="input-group">
                            <label>Valor da Parcela (Detectado) (R$)</label>
                            <div className="input-icon-wrapper">
                                <DollarSign className="input-icon" />
                                <input
                                    type="text"
                                    placeholder="R$ 0,00"
                                    value={contract.valorParcela}
                                    onChange={e => handleMoneyChange('valorParcela', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Quantidade Parcelas (Detectado)</label>
                            <input type="number" placeholder="Automático" value={contract.qtdParcelas} onChange={e => setContract({ ...contract, qtdParcelas: e.target.value })} />
                        </div>
                    </div>

                    <div className="form-row-2">
                        <div className="input-group">
                            <label>Modalidade</label>
                            <input type="text" value="Cartão Consignado (RMC)" disabled className="input-disabled" />
                        </div>
                        <div className="input-group">
                            <label>Taxa Média BACEN (% a.m.)</label>
                            <div className="input-icon-wrapper">
                                <Percent className="input-icon" />
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder={isFetchingRate ? "Buscando no BACEN..." : "Ex: 1.80"}
                                    value={contract.taxaJuros}
                                    onChange={e => setContract({ ...contract, taxaJuros: e.target.value })}
                                    style={isFetchingRate ? { backgroundColor: '#fff3cd' } : {}}
                                />
                            </div>
                            {isFetchingRate && <small style={{ color: '#d97706', fontSize: '0.8rem' }}>Consultando Série 25468...</small>}
                        </div>
                    </div>
                </section>

                <section className="form-section">
                    <h3 className="section-title">Histórico HISCRE</h3>
                    <div className="upload-container">
                        <input type="file" id="hiscre-upload-btn" hidden onChange={handleFileUpload} accept=".pdf,.txt,.csv,image/*" disabled={isProcessing} />
                        <label htmlFor="hiscre-upload-btn" className={`upload-button-styled ${isProcessing ? 'disabled' : ''} ${payments.length > 0 ? 'success' : ''}`}>
                            {isProcessing ? <RefreshCw className="spin" /> : payments.length > 0 ? <CheckCircle /> : <Upload />}
                            <span>{isProcessing ? `Lendo... ${progressStatus}` : payments.length > 0 ? `${payments.length} parcelas lidas` : "Carregar PDF/Imagem"}</span>
                        </label>
                        {uploadError && <div className="error-message"><AlertCircle size={16} />{uploadError}</div>}
                    </div>
                </section>

                <section className="form-section">
                    <div className="checkbox-group">
                        <input type="checkbox" id="dobroCheck" checked={contract.restituicaoDobro} onChange={e => setContract({ ...contract, restituicaoDobro: e.target.checked })} />
                        <label htmlFor="dobroCheck">Calcular Restituição em Dobro (pós-2021)</label>
                    </div>
                </section>

                <div className="form-row-2 action-buttons">
                    <button className="btn-primary-green" onClick={calculate} disabled={payments.length === 0 || isProcessing}>
                        Calcular Análise
                    </button>

                    {evolution.length > 0 ? (
                        <BlobProvider document={
                            <ReportPDF
                                client={client}
                                contract={{
                                    ...contract,
                                    valorOriginal: parseCurrencyToFloat(contract.valorOriginal),
                                    valorParcela: parseCurrencyToFloat(contract.valorParcela)
                                }}
                                summary={summary}
                                evolution={evolution}
                            />
                        }>
                            {({ blob, url, loading, error }) => {
                                const handlePreview = () => {
                                    if (url) {
                                        window.open(url, '_blank');
                                    }
                                };

                                return (
                                    <button
                                        className="btn-secondary-outline"
                                        onClick={handlePreview}
                                        disabled={loading || !url}
                                    >
                                        <Printer size={18} />
                                        {loading ? 'Gerando...' : 'Visualizar Relatório PDF'}
                                    </button>
                                );
                            }}
                        </BlobProvider>
                    ) : (
                        <button className="btn-secondary-outline" disabled><Printer size={18} /> Gerar PDF</button>
                    )}
                </div>

                {evolution.length > 0 && (
                    <div style={{ marginTop: '3rem', borderTop: '2px solid #eee', paddingTop: '2rem' }}>
                        <h2 style={{ color: 'var(--primary-color)' }}>Resultado da Análise</h2>
                        <div className="form-row-2" style={{ marginBottom: '2rem' }}>
                            <div className="summary-box" style={{ background: '#e8f5e9', padding: '1.5rem', borderRadius: '8px' }}>
                                <h3>Valor a Restituir</h3>
                                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{fmtBRL(summary.valorRestituir)}</p>
                                {contract.restituicaoDobro && <small>Incluso dobra legal após 03/2021</small>}
                            </div>
                            <div className="summary-box" style={{ background: '#f5f5f5', padding: '1.5rem', borderRadius: '8px' }}>
                                <h3>Saldo Devedor Real</h3>
                                <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{fmtBRL(summary.saldoDevedorAtual)}</p>
                                <small>Contra o saldo informado pelo banco</small>
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead style={{ background: '#f0f2f5' }}><tr><th style={{ padding: 8, textAlign: 'left' }}>Data</th><th style={{ padding: 8, textAlign: 'right' }}>Pago</th><th style={{ padding: 8, textAlign: 'right' }}>Saldo Atualizado</th><th style={{ padding: 8, textAlign: 'right' }}>Restituição</th></tr></thead>
                                <tbody>
                                    {evolution.map(row => (
                                        <tr key={row.id} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: 8 }}>{fmtDate(row.dataReferencia)}</td>
                                            <td style={{ padding: 8, textAlign: 'right' }}>{fmtBRL(parseCurrencyToFloat(row.valorPago))}</td>
                                            <td style={{ padding: 8, textAlign: 'right' }}>{fmtBRL(row.saldoAtual)}</td>
                                            <td style={{ padding: 8, textAlign: 'right', color: 'var(--primary-color)', fontWeight: 'bold' }}>{fmtBRL(row.valorRestituir)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                :root {
                    --primary-color: #9cc094;
                    --primary-dark: #82a37a;
                    --text-dark: #333;
                    --text-gray: #666;
                    --bg-input: #f0f2f5;
                    --border-color: #dce0e5;
                }
                .dashboard-wrapper { 
                    font-family: 'Segoe UI', Roboto, sans-serif; 
                    background-color: #f9fafb; 
                    padding: 2rem; 
                    display: flex; 
                    justify-content: center; 
                    min-height: 100vh;
                    width: 100%;
                    box-sizing: border-box;
                }
                .dashboard-container { 
                    background-color: #fff; 
                    padding: 2.5rem; 
                    border-radius: 12px; 
                    box-shadow: 0 4px 20px rgba(0,0,0,0.08); 
                    width: 100%; 
                    max-width: 1200px;
                }
                .main-title { color: var(--text-dark); font-size: 1.8rem; margin-bottom: 2rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; }
                .section-title { color: var(--text-dark); font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem; }
                .form-section { margin-bottom: 2rem; }
                .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1rem; }
                @media (max-width: 768px) { .form-row-2 { grid-template-columns: 1fr; } }
                .input-group { display: flex; flex-direction: column; }
                .input-group label { font-size: 0.9rem; color: #666; margin-bottom: 0.5rem; font-weight: 500; }
                .input-icon-wrapper { position: relative; display: flex; align-items: center; }
                .input-icon { position: absolute; left: 12px; color: #9ca3af; width: 18px; height: 18px; }
                input[type="text"], input[type="number"], input[type="date"] { width: 100%; padding: 0.75rem 1rem; padding-left: 2.5rem; background-color: var(--bg-input); border: 1px solid transparent; border-radius: 6px; font-size: 1rem; color: var(--text-dark); }
                .input-group input:not(input[type="date"]){ padding-left: 1rem; }
                .input-icon-wrapper input { padding-left: 2.5rem !important; }
                input:focus { background-color: #fff; border-color: var(--primary-color); outline: none; box-shadow: 0 0 0 3px rgba(156, 192, 148, 0.2); }
                .input-disabled { background-color: #e9ecef !important; color: #6c757d !important; cursor: not-allowed; }
                .upload-button-styled { display: flex; align-items: center; justify-content: center; gap: 0.75rem; width: 100%; padding: 0.75rem; background-color: var(--bg-input); border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; transition: all 0.2s; }
                .upload-button-styled:hover { background-color: #e2e6ea; }
                .upload-button-styled.success { background-color: #dcfce7; color: #166534; border-color: #86efac; }
                .error-message { color: #dc2626; font-size: 0.9rem; margin-top: 0.5rem; display: flex; align-items: center; gap: 0.5rem; }
                .checkbox-group { display: flex; align-items: center; gap: 0.75rem; }
                .checkbox-group input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--primary-color); }
                .action-buttons { margin-top: 2.5rem; }
                .btn-primary-green { width: 100%; padding: 0.875rem; background-color: var(--primary-color); color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background-color 0.2s; }
                .btn-primary-green:hover:not(:disabled) { background-color: var(--primary-dark); }
                .btn-primary-green:disabled { opacity: 0.6; cursor: not-allowed; }
                .btn-secondary-outline { width: 100%; padding: 0.875rem; background-color: transparent; color: #666; border: 1px solid var(--border-color); border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 0.5rem; transition: all 0.2s; }
                .btn-secondary-outline:hover:not(:disabled) { background-color: var(--bg-input); color: var(--text-dark); }
                .btn-secondary-outline:disabled { opacity: 0.6; cursor: not-allowed; }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}