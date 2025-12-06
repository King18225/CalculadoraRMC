import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

// --- ESTILOS PREMIUM / HIGH-END (Visual Jurídico) ---
const mainDark = '#222222';  // Preto Suavizado
const lineGrey = '#666666';  // Cinza Chumbo Fino
const lightBg = '#fcfcfc';   // Fundo muito sutil

const styles = StyleSheet.create({
    page: {
        paddingTop: 50,
        paddingBottom: 50,
        paddingHorizontal: 40,
        fontSize: 10,
        fontFamily: 'Helvetica', // Corpo Padrão Sans-Serif
        color: mainDark,
        lineHeight: 1.3
    },

    // --- RODAPÉ FIXO ---
    footerContainer: {
        position: 'absolute',
        bottom: 25,
        left: 40,
        right: 40,
        borderTop: `0.5pt solid ${lineGrey}`,
        paddingTop: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    footerText: {
        fontSize: 8,
        color: '#666',
        fontFamily: 'Helvetica'
    },

    // --- CABEÇALHO DA PÁGINA (Escritório / Título) ---
    headerContainer: {
        marginBottom: 30,
        borderBottom: `0.5pt solid ${lineGrey}`,
        paddingBottom: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    headerLogoBox: {
        flexDirection: 'column'
    },
    headerLogoText: {
        fontSize: 14,
        fontFamily: 'Times-Roman', // Branding Serifado
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: mainDark
    },
    headerSubTitle: {
        fontSize: 10,
        fontFamily: 'Times-Roman',
        color: '#444',
        marginTop: 4
    },
    headerDate: {
        fontSize: 8,
        fontFamily: 'Helvetica',
        color: '#666',
        textAlign: 'right'
    },

    // --- TÍTULOS DE SEÇÃO (SERIFADOS) ---
    sectionTitle: {
        fontSize: 11,
        fontFamily: 'Times-Roman', // Autoridade Jurídica
        fontWeight: 'bold',
        marginTop: 18,
        marginBottom: 6,
        textTransform: 'uppercase',
        color: mainDark,
        borderBottom: `0.5pt solid ${lineGrey}`,
        width: '100%',
        paddingBottom: 3
    },

    // --- TABELAS GERAIS ---
    dataTable: {
        width: '100%',
        marginBottom: 15,
        // Sem bordas externas
    },
    dataRow: {
        flexDirection: 'row',
        paddingVertical: 3,
        alignItems: 'center'
    },
    dataLabel: {
        width: '35%',
        fontSize: 9,
        fontWeight: 'bold', // Helvetica-Bold implícito
        color: '#444'
    },
    dataValue: {
        width: '65%',
        fontSize: 9,
        color: mainDark
        // Helvetica normal
    },

    // --- RESUMO DO RESULTADO ---
    summaryTable: {
        marginTop: 5,
        marginBottom: 20,
        borderBottom: `0.5pt solid ${mainDark}` // Linha de fechamento sutil
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
    },
    summaryLabel: {
        fontSize: 10,
        color: '#333',
        width: '60%'
    },
    summaryValue: {
        fontSize: 10,
        fontWeight: 'bold',
        color: mainDark,
        width: '40%',
        textAlign: 'right'
    },

    // --- TABELA DE EVOLUÇÃO (GRID FINO) ---
    evolutionHeader: {
        flexDirection: 'row',
        backgroundColor: '#f2f2f2',
        borderTop: `0.5pt solid ${lineGrey}`,
        borderBottom: `0.5pt solid ${lineGrey}`,
        borderLeft: `0.5pt solid ${lineGrey}`,
        marginTop: 10,
        alignItems: 'stretch'
    },
    evolutionRow: {
        flexDirection: 'row',
        borderBottom: `0.5pt solid ${lineGrey}`,
        borderLeft: `0.5pt solid ${lineGrey}`,
        alignItems: 'stretch'
    },
    evolutionFooterRow: {
        flexDirection: 'row',
        borderBottom: `0.5pt solid ${lineGrey}`,
        borderLeft: `0.5pt solid ${lineGrey}`,
        alignItems: 'stretch',
        backgroundColor: '#fafafa',
        borderTop: `0.5pt solid #222` // Destaque para o total
    },

    cellStyle: {
        borderRight: `0.5pt solid ${lineGrey}`,
        paddingVertical: 4,
        paddingHorizontal: 3,
        fontSize: 7, // Numérico pequeno e limpo
    },

    // Colunas
    colIdx: { width: '5%', textAlign: 'center', fontWeight: 'bold' },
    colData: { width: '10%', textAlign: 'center' },
    colRMC: { width: '11%', textAlign: 'right' },
    colSaldoAnt: { width: '13%', textAlign: 'right' },
    colTaxa: { width: '6%', textAlign: 'center' },
    colJuros: { width: '10%', textAlign: 'right' },
    colAmort: { width: '10%', textAlign: 'right', color: '#1b5e20', fontWeight: 'bold' }, // Verde floresta escuro
    colRestituir: { width: '15%', textAlign: 'right', color: '#b71c1c', fontWeight: 'bold' }, // Vermelho sangue escuro
    colSaldoAtual: { width: '20%', textAlign: 'right', fontWeight: 'bold' },

    headerText: { fontWeight: 'bold', color: mainDark, textAlign: 'center', lineHeight: 1.1, fontFamily: 'Helvetica' }
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

    // Processamento da Evolução
    const processedEvolution = evolution.map(row => {
        let valorRestituir = 0;
        let amortizacaoExibida = row.amortizacao;
        const saldoAnterior = row.saldoAnterior;
        const valorPago = parseFloat(row.valorPago);

        if (saldoAnterior <= 0) {
            valorRestituir = valorPago;
            amortizacaoExibida = 0;
        } else if (row.saldoAtual < 0 && saldoAnterior > 0) {
            valorRestituir = Math.abs(row.saldoAtual);
            amortizacaoExibida = row.amortizacao - valorRestituir;
            if (amortizacaoExibida < 0) amortizacaoExibida = 0;
        }

        return {
            ...row,
            valorRestituir,
            amortizacaoExibida
        };
    });

    const totalPago = processedEvolution.reduce((acc, i) => acc + parseFloat(i.valorPago), 0);
    const totalJuros = processedEvolution.reduce((acc, i) => acc + i.juros, 0);
    const totalAmortizado = processedEvolution.reduce((acc, i) => acc + i.amortizacaoExibida, 0);
    const totalRestituir = processedEvolution.reduce((acc, i) => acc + i.valorRestituir, 0);

    const taxaJurosFormatada = contract.taxaJuros ? `${contract.taxaJuros}%` : '-';

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* RODAPÉ FIXO (Em todas as páginas) */}
                <View style={styles.footerContainer} fixed>
                    <Text style={styles.footerText}>Relatório Técnico Pericial - RMC</Text>
                    <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
                        `Página ${pageNumber} de ${totalPages}`
                    )} fixed />
                </View>

                {/* 1. CABEÇALHO (Apenas na página 1, ou repetido? Geralmente logo é pág 1) 
                    Vamos deixar fixo? O usuário disse 'Na primeira página...'. 
                    Então sem 'fixed'.
                */}
                <View style={styles.headerContainer}>
                    <View style={styles.headerLogoBox}>
                        <Text style={styles.headerLogoText}>SEU ESCRITÓRIO DE ADVOCACIA</Text>
                        <Text style={styles.headerSubTitle}>EXCELÊNCIA EM CÁLCULOS JURÍDICOS</Text>
                    </View>
                    <View>
                        <Text style={[styles.headerLogoText, { fontSize: 10, textAlign: 'right' }]}>LAUDO TÉCNICO</Text>
                        <Text style={styles.headerDate}>{fmtDateTime()}</Text>
                    </View>
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
                        <Text style={styles.summaryLabel}>Valor pago</Text>
                        <Text style={styles.summaryValue}>{fmtBRL(totalPago)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Valor a restituir (em dobro a partir da quitação)</Text>
                        <Text style={[styles.summaryValue, { fontWeight: 'bold' }]}>{fmtBRL(summary.valorRestituir)}</Text>
                    </View>
                </View>

                {/* 6. TABELA DE EVOLUÇÃO */}
                <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Memória de Cálculo (Evolução do Saldo)</Text>

                {/* Cabeçalho da Tabela */}
                <View style={styles.evolutionHeader} fixed>
                    <Text style={[styles.cellStyle, styles.colIdx, styles.headerText]}>Nº</Text>
                    <Text style={[styles.cellStyle, styles.colData, styles.headerText]}>Data</Text>
                    <Text style={[styles.cellStyle, styles.colRMC, styles.headerText]}>Valor RMC debitado</Text>
                    <Text style={[styles.cellStyle, styles.colSaldoAnt, styles.headerText]}>Saldo devedor (base)</Text>
                    <Text style={[styles.cellStyle, styles.colTaxa, styles.headerText]}>Taxa</Text>
                    <Text style={[styles.cellStyle, styles.colJuros, styles.headerText]}>Juros mensais (-)</Text>
                    <Text style={[styles.cellStyle, styles.colAmort, styles.headerText]}>Amortização (+)</Text>
                    <Text style={[styles.cellStyle, styles.colRestituir, styles.headerText]}>Valor a Restituir</Text>
                    <Text style={[styles.cellStyle, styles.colSaldoAtual, styles.headerText]}>Saldo devedor atual</Text>
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
                        <Text style={[styles.cellStyle, styles.colAmort]}>{fmtBRL(row.amortizacaoExibida)}</Text>
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
                    <Text style={[styles.cellStyle, styles.colAmort, { fontWeight: 'bold', color: '#1b5e20' }]}>{fmtBRL(totalAmortizado)}</Text>
                    <Text style={[styles.cellStyle, styles.colRestituir, { fontWeight: 'bold', color: '#b71c1c' }]}>{fmtBRL(totalRestituir)}</Text>

                    <Text style={[styles.cellStyle, styles.colSaldoAtual]}></Text>
                </View>

            </Page>
        </Document>
    );
};
