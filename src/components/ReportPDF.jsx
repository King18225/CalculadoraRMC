import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

// --- ESTILOS GERAIS COMPACTOS E MINIMALISTAS ---
const borderColor = '#e0e0e0';

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 8,
        fontFamily: 'Helvetica',
        color: '#333',
        lineHeight: 1.4
    },

    // 1. CABEÇALHO
    headerContainer: {
        marginBottom: 25,
        borderBottom: '1px solid #ddd',
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end'
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000',
        textTransform: 'uppercase'
    },
    headerDate: {
        fontSize: 8,
        color: '#666'
    },

    // 2. TÍTULOS DE SEÇÃO
    sectionTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 15,
        marginBottom: 8,
        textTransform: 'uppercase',
        color: '#000',
        borderBottom: '1px solid #000',
        width: '100%',
        paddingBottom: 2
    },

    // 3. TABELAS DE DADOS
    dataTable: {
        width: '100%',
        marginBottom: 15,
        borderTop: '1px solid #ddd'
    },
    dataRow: {
        flexDirection: 'row',
        borderBottom: '1px solid #eee',
        paddingVertical: 4,
        alignItems: 'center'
    },
    dataLabel: {
        width: '35%',
        fontSize: 9,
        fontWeight: 'bold',
        color: '#444'
    },
    dataValue: {
        width: '65%',
        fontSize: 9,
        color: '#000'
    },

    // 4. QUADRO DE RESULTADO
    summaryTable: {
        marginTop: 5,
        marginBottom: 20,
        borderTop: '1px solid #000',
        borderBottom: '1px solid #000'
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottom: '1px solid #eee'
    },
    summaryLabel: {
        fontSize: 10,
        color: '#333',
        width: '60%'
    },
    summaryValue: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#000',
        width: '40%',
        textAlign: 'right'
    },
    summaryTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        backgroundColor: '#f8f8f8',
        paddingHorizontal: 5
    },
    summaryTotalLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        width: '60%'
    },
    summaryTotalValue: {
        fontSize: 12,
        fontWeight: 'bold',
        width: '40%',
        textAlign: 'right'
    },

    // 5. TABELA DE EVOLUÇÃO (GRID FULL)

    evolutionHeader: {
        flexDirection: 'row',
        backgroundColor: '#f4f4f4',
        borderTop: `1px solid ${borderColor}`,
        borderBottom: `1px solid ${borderColor}`,
        borderLeft: `1px solid ${borderColor}`,
        marginTop: 10,
        alignItems: 'stretch'
    },
    evolutionRow: {
        flexDirection: 'row',
        borderBottom: `1px solid ${borderColor}`,
        borderLeft: `1px solid ${borderColor}`,
        alignItems: 'stretch'
    },
    evolutionFooterRow: {
        flexDirection: 'row',
        borderBottom: `1px solid ${borderColor}`,
        borderLeft: `1px solid ${borderColor}`,
        alignItems: 'stretch',
        backgroundColor: '#f9f9f9',
        borderTop: '1px solid #000'
    },

    cellStyle: {
        borderRight: `1px solid ${borderColor}`,
        paddingVertical: 4,
        paddingHorizontal: 2,
        fontSize: 6.5, // Reduzido ligeiramente para acomodar nova coluna
    },

    // Colunas Evolução (Total 100%) - Redistribuição para 9 colunas
    // 1. Nº (5%)
    colIdx: { width: '5%', textAlign: 'center', fontWeight: 'bold' },
    // 2. Data (10%)
    colData: { width: '10%', textAlign: 'center' },
    // 3. RMC (11%)
    colRMC: { width: '11%', textAlign: 'right' },
    // 4. Saldo Ant (13%)
    colSaldoAnt: { width: '13%', textAlign: 'right' },
    // 5. Taxa (6%)
    colTaxa: { width: '6%', textAlign: 'center' },
    // 6. Juros (10%)
    colJuros: { width: '10%', textAlign: 'right' },
    // 7. Amort. (10%)
    colAmort: { width: '10%', textAlign: 'right', color: '#009e2a', fontWeight: 'bold' },
    // 8. Restituir (15%) - NOVA COLUNA DESTAQUE
    colRestituir: { width: '15%', textAlign: 'right', color: '#d32f2f', fontWeight: 'bold' },
    // 9. Saldo Atual (20%)
    colSaldoAtual: { width: '20%', textAlign: 'right', fontWeight: 'bold' },

    headerText: { fontWeight: 'bold', color: '#000', textAlign: 'center', lineHeight: 1.2 }
});

// Formatadores
const fmtBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtDate = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    return new Date(dt.valueOf() + dt.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
};
const fmtDateTime = () => {
    const now = new Date();
    return `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`;
};

export const ReportPDF = ({ client, contract, summary, evolution }) => {

    // Processamento da Evolução para separar Amortização x Restituição
    const processedEvolution = evolution.map(row => {
        let valorRestituir = 0;
        let amortizacaoExibida = row.amortizacao;
        const saldoAnterior = row.saldoAnterior;
        const valorPago = parseFloat(row.valorPago);

        if (saldoAnterior <= 0) {
            // CENÁRIO B: Dívida já estava quitada (ou é credora)
            // Tudo que foi pago é indébito a restituir
            valorRestituir = valorPago;
            amortizacaoExibida = 0;
        } else if (row.saldoAtual < 0 && saldoAnterior > 0) {
            // CENÁRIO HÍBRIDO: Quitou nesta parcela e sobrou troco
            // O saldo atual negativo é o valor excedente (com sinal trocado)
            // Restituir é o excesso pago.
            valorRestituir = Math.abs(row.saldoAtual);

            // Amortização é o que foi usado para zerar o saldo anterior + juros
            // Ou simplesmente: Amortização Original - Restituir
            amortizacaoExibida = row.amortizacao - valorRestituir;

            // Ajuste fino para não exibir amortização negativa por arredondamento
            if (amortizacaoExibida < 0) amortizacaoExibida = 0;
        }

        return {
            ...row,
            valorRestituir,
            amortizacaoExibida
        };
    });

    // Cálculos de Totais (Baseados nos dados processados)
    const totalPago = processedEvolution.reduce((acc, i) => acc + parseFloat(i.valorPago), 0);
    const totalJuros = processedEvolution.reduce((acc, i) => acc + i.juros, 0);
    const totalAmortizado = processedEvolution.reduce((acc, i) => acc + i.amortizacaoExibida, 0);
    const totalRestituir = processedEvolution.reduce((acc, i) => acc + i.valorRestituir, 0);

    const taxaJurosFormatada = contract.taxaJuros ? `${contract.taxaJuros}%` : '-';

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* 1. CABEÇALHO */}
                <View style={styles.headerContainer}>
                    <Text style={styles.headerTitle}>Cálculo de Revisão da RMC</Text>
                    <Text style={styles.headerDate}>Relatório gerado em: {fmtDateTime()}</Text>
                </View>

                {/* 2. DADOS DO CLIENTE */}
                <Text style={styles.sectionTitle}>Dados do Cliente</Text>
                <View style={styles.dataTable}>
                    <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Nome:</Text>
                        <Text style={styles.dataValue}>{client.nome || 'Não informado'}</Text>
                    </View>
                    <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>CPF (Aut.):</Text>
                        <Text style={styles.dataValue}>{client.cpf || '-'}</Text>
                    </View>
                    <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Nº Benefício (NB):</Text>
                        <Text style={styles.dataValue}>{client.beneficio || '-'}</Text>
                    </View>
                </View>

                {/* 3. DADOS DO CÁLCULO */}
                <Text style={styles.sectionTitle}>Dados do Cálculo</Text>
                <View style={styles.dataTable}>
                    <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Data Base do Cálculo:</Text>
                        <Text style={styles.dataValue}>{new Date().toLocaleDateString('pt-BR')}</Text>
                    </View>
                </View>

                {/* 4. DADOS DO CONTRATO */}
                <Text style={styles.sectionTitle}>Dados do Contrato</Text>
                <View style={[styles.dataTable, { marginBottom: 30 }]}>
                    <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Valor do Empréstimo:</Text>
                        <Text style={styles.dataValue}>{fmtBRL(contract.valorOriginal)}</Text>
                    </View>
                    <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>Data de Obtenção:</Text>
                        <Text style={styles.dataValue}>{fmtDate(contract.dataInicio)}</Text>
                    </View>
                </View>

                {/* 5. QUADRO DE RESULTADO */}
                <Text style={styles.sectionTitle}>Resumo do Resultado</Text>
                <View style={styles.summaryTable}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Valor</Text>
                        <Text style={styles.summaryValue}>{fmtBRL(summary.valorRestituir)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Subtotal</Text>
                        <Text style={styles.summaryValue}>{fmtBRL(summary.valorRestituir)}</Text>
                    </View>
                    <View style={styles.summaryTotalRow}>
                        <Text style={styles.summaryTotalLabel}>Total</Text>
                        <Text style={styles.summaryTotalValue}>{fmtBRL(summary.valorRestituir)}</Text>
                    </View>
                </View>

                {/* 6. TABELA DE EVOLUÇÃO */}
                <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Memória de Cálculo (Evolução do Saldo)</Text>

                {/* Cabeçalho da Tabela - 9 COLUNAS */}
                <View style={styles.evolutionHeader}>
                    <Text style={[styles.cellStyle, styles.colIdx, styles.headerText]}>Nº</Text>
                    <Text style={[styles.cellStyle, styles.colData, styles.headerText]}>Data</Text>
                    <Text style={[styles.cellStyle, styles.colRMC, styles.headerText, { textAlign: 'right' }]}>Valor RMC debitado</Text>
                    <Text style={[styles.cellStyle, styles.colSaldoAnt, styles.headerText, { textAlign: 'right' }]}>Saldo devedor (base)</Text>
                    <Text style={[styles.cellStyle, styles.colTaxa, styles.headerText]}>Taxa</Text>
                    <Text style={[styles.cellStyle, styles.colJuros, styles.headerText, { textAlign: 'right' }]}>Juros mensais (-)</Text>
                    <Text style={[styles.cellStyle, styles.colAmort, styles.headerText, { textAlign: 'right', color: '#000' }]}>Amortização (+)</Text>
                    {/* NOVA COLUNA */}
                    <Text style={[styles.cellStyle, styles.colRestituir, styles.headerText, { textAlign: 'right', color: '#d32f2f' }]}>Valor a Restituir</Text>
                    <Text style={[styles.cellStyle, styles.colSaldoAtual, styles.headerText, { textAlign: 'right' }]}>Saldo devedor atual</Text>
                </View>

                {/* Linhas da Tabela */}
                {processedEvolution.map((row, i) => (
                    <View key={i} style={[styles.evolutionRow, { backgroundColor: i % 2 !== 0 ? '#FAFAFA' : '#FFF' }]}>
                        <Text style={[styles.cellStyle, styles.colIdx]}>{row.index}</Text>
                        <Text style={[styles.cellStyle, styles.colData]}>{fmtDate(row.dataReferencia)}</Text>
                        <Text style={[styles.cellStyle, styles.colRMC]}>{fmtBRL(parseFloat(row.valorPago))}</Text>
                        <Text style={[styles.cellStyle, styles.colSaldoAnt]}>{fmtBRL(row.saldoAnterior)}</Text>
                        <Text style={[styles.cellStyle, styles.colTaxa]}>{taxaJurosFormatada}</Text>
                        <Text style={[styles.cellStyle, styles.colJuros]}>{fmtBRL(row.juros)}</Text>

                        {/* Amortização Exibida (Recalculada) */}
                        <Text style={[styles.cellStyle, styles.colAmort]}>{fmtBRL(row.amortizacaoExibida)}</Text>

                        {/* Valor a Restituir (Novo) */}
                        <Text style={[styles.cellStyle, styles.colRestituir]}>{fmtBRL(row.valorRestituir)}</Text>

                        <Text style={[styles.cellStyle, styles.colSaldoAtual]}>{fmtBRL(row.saldoAtual)}</Text>
                    </View>
                ))}

                {/* Linha de TOTAIS (Footer) */}
                <View style={styles.evolutionFooterRow}>
                    <Text style={[styles.cellStyle, { width: '15%', textAlign: 'center', fontWeight: 'bold' }]}>TOTAIS</Text>

                    <Text style={[styles.cellStyle, styles.colRMC, { fontWeight: 'bold' }]}>{fmtBRL(totalPago)}</Text>
                    <Text style={[styles.cellStyle, styles.colSaldoAnt]}></Text>
                    <Text style={[styles.cellStyle, styles.colTaxa]}></Text>
                    <Text style={[styles.cellStyle, styles.colJuros, { fontWeight: 'bold' }]}>{fmtBRL(totalJuros)}</Text>
                    <Text style={[styles.cellStyle, styles.colAmort, { fontWeight: 'bold', color: '#009e2a' }]}>{fmtBRL(totalAmortizado)}</Text>
                    {/* Total Restituir */}
                    <Text style={[styles.cellStyle, styles.colRestituir, { fontWeight: 'bold', color: '#d32f2f' }]}>{fmtBRL(totalRestituir)}</Text>

                    <Text style={[styles.cellStyle, styles.colSaldoAtual]}></Text>
                </View>

            </Page>
        </Document>
    );
};
