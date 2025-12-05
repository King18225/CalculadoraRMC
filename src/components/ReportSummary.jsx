import React from 'react';
import { Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        border: '1px solid #000',
        fontSize: 10,
        fontFamily: 'Helvetica',
    },
    header: {
        backgroundColor: '#f0f0f0',
        padding: 8,
        borderBottom: '1px solid #000',
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    headerSubtitle: {
        fontSize: 8,
        textAlign: 'center',
        color: '#666',
    },
    section: {
        borderBottom: '1px solid #000',
    },
    sectionTitle: {
        backgroundColor: '#e0e0e0',
        padding: 4,
        fontWeight: 'bold',
        fontSize: 10,
        borderBottom: '1px solid #000',
    },
    row: {
        flexDirection: 'row',
        borderBottom: '1px solid #ccc',
    },
    lastRow: {
        borderBottom: 'none',
    },
    label: {
        width: '35%',
        padding: 4,
        borderRight: '1px solid #ccc',
        backgroundColor: '#f9f9f9',
        fontWeight: 'bold',
        fontSize: 9,
    },
    value: {
        width: '65%',
        padding: 4,
        fontSize: 9,
    },
    // Result Board specific
    resultBoard: {
        marginTop: 20,
        marginBottom: 20,
        border: '1px solid #000',
    },
    resultRow: {
        flexDirection: 'row',
        borderBottom: '1px solid #ccc',
    },
    resultLabel: {
        flex: 1,
        padding: 6,
        fontWeight: 'bold',
        backgroundColor: '#f5f5f5',
        borderRight: '1px solid #ccc',
        fontSize: 10,
    },
    resultValue: {
        width: 140,
        padding: 6,
        textAlign: 'right',
        fontSize: 10,
    },
    totalRow: {
        flexDirection: 'row',
        backgroundColor: '#000',
        color: '#fff',
    },
    totalLabel: {
        flex: 1,
        padding: 8,
        fontWeight: 'bold',
        textAlign: 'right',
        paddingRight: 20,
        fontSize: 11,
    },
    totalValue: {
        width: 140,
        padding: 8,
        textAlign: 'right',
        fontWeight: 'bold',
        fontSize: 11,
    },
});

const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Date(date.valueOf() + date.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
};

export const ReportSummary = ({ client, contract, summary }) => {
    const currentDate = new Date().toLocaleDateString('pt-BR');
    const currentTime = new Date().toLocaleTimeString('pt-BR');

    // Cálculo da Idade
    const calculateAge = (birthDate) => {
        if (!birthDate) return '---';
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return `${age} anos`;
    };

    const idade = calculateAge(client.nascimento);

    // Mock values for fields not yet in state
    const danosMorais = 0.00;

    // Cálculo de Honorários
    const percentualHonorarios = parseFloat(contract.honorarios) || 0;
    const honorarios = (summary.valorRestituir * percentualHonorarios) / 100;

    const totalCondenacao = summary.valorRestituir + danosMorais + honorarios;

    return (
        <View>
            {/* 1. Header do Laudo */}
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Cálculo de Revisão da RMC / RCC</Text>
                    <Text style={styles.headerSubtitle}>Relatório gerado em: {currentDate} às {currentTime}</Text>
                </View>

                {/* 2. Grid de Informações */}
                {/* Seção A: Dados do Cliente */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Dados do Cliente</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Nome:</Text>
                        <Text style={styles.value}>{client.nome || 'Não informado'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>CPF:</Text>
                        <Text style={styles.value}>{client.cpf || 'Não informado'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Data de Nascimento:</Text>
                        <Text style={styles.value}>{formatDate(client.nascimento)}</Text>
                    </View>
                    <View style={[styles.row, styles.lastRow]}>
                        <Text style={styles.label}>Idade Calculada:</Text>
                        <Text style={styles.value}>{idade}</Text>
                    </View>
                </View>

                {/* Seção B: Dados do Contrato */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Dados do Contrato</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Valor do Empréstimo:</Text>
                        <Text style={styles.value}>{formatCurrency(contract.valorOriginal)}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Data de Obtenção:</Text>
                        <Text style={styles.value}>{formatDate(contract.dataInicio)}</Text>
                    </View>
                    <View style={[styles.row, styles.lastRow]}>
                        <Text style={styles.label}>Taxa de Juros Mensal:</Text>
                        <Text style={styles.value}>{contract.taxaJuros}% a.m.</Text>
                    </View>
                </View>

                {/* Seção C: Parâmetros */}
                <View style={[styles.section, { borderBottom: 'none' }]}>
                    <Text style={styles.sectionTitle}>Parâmetros do Cálculo</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Metodologia:</Text>
                        <Text style={styles.value}>Conversão em Empréstimo Consignado</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Índice de Correção:</Text>
                        <Text style={styles.value}>IPCA-E (IBGE)</Text>
                    </View>
                    <View style={[styles.row, styles.lastRow]}>
                        <Text style={styles.label}>Restituição em Dobro:</Text>
                        <Text style={styles.value}>
                            {contract.restituicaoDobro
                                ? 'Sim (Modulação STJ - A partir de 30/03/2021)'
                                : 'Não (Devolução Simples)'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* 3. Quadro de Resultado */}
            <View style={styles.resultBoard}>
                <Text style={[styles.sectionTitle, { backgroundColor: '#333', color: '#fff', textAlign: 'center', borderBottom: 'none' }]}>
                    RESUMO DO RESULTADO
                </Text>

                <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Saldo Devedor Recalculado (Real):</Text>
                    <Text style={styles.resultValue}>{formatCurrency(summary.saldoDevedorAtual)}</Text>
                </View>
                <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Total Pago pelo Cliente (Histórico):</Text>
                    <Text style={styles.resultValue}>{formatCurrency(summary.totalPago)}</Text>
                </View>

                {/* Detalhamento da Restituição */}
                <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Indébito Simples (S/ Dobra):</Text>
                    <Text style={styles.resultValue}>{formatCurrency(summary.indebitoSimples)}</Text>
                </View>

                {summary.totalDobras > 0 && (
                    <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>+ Dobra Legal (STJ pós-03/21):</Text>
                        <Text style={styles.resultValue}>{formatCurrency(summary.totalDobras)}</Text>
                    </View>
                )}

                <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>= Total a Restituir:</Text>
                    <Text style={[styles.resultValue, { fontWeight: 'bold' }]}>{formatCurrency(summary.valorRestituir)}</Text>
                </View>

                <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Danos Morais (Estimado):</Text>
                    <Text style={styles.resultValue}>{formatCurrency(danosMorais)}</Text>
                </View>
                <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Honorários Advocatícios ({percentualHonorarios}%):</Text>
                    <Text style={styles.resultValue}>{formatCurrency(honorarios)}</Text>
                </View>

                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>TOTAL DA CONDENAÇÃO:</Text>
                    <Text style={styles.totalValue}>{formatCurrency(totalCondenacao)}</Text>
                </View>
            </View>
        </View>
    );
};
