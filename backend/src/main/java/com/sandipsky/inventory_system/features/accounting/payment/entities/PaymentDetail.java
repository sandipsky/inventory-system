package com.sandipsky.inventory_system.features.accounting.payment.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "payment_detail")
public class PaymentDetail {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    private int masterPaymentId;

    private String invoiceDate;

    private String invoiceNumber;

    @Column(columnDefinition = "double not null default 0")
    private double totalInvoiceAmount;

    @Column(columnDefinition = "double not null default 0")
    private double dueAmount;

    @Column(columnDefinition = "double not null default 0")
    private double paidAmount;
}