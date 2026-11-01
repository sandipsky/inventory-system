package com.sandipsky.inventory_system.features.accounting.payment.services;
import com.sandipsky.inventory_system.features.accounting.payment.dtos.PaymentDetailDTO;
import com.sandipsky.inventory_system.features.accounting.payment.dtos.MasterPaymentDTO;
import com.sandipsky.inventory_system.features.accounting.payment.entities.AmountDueInvoice;
import com.sandipsky.inventory_system.features.accounting.payment.entities.MasterPayment;
import com.sandipsky.inventory_system.features.accounting.payment.entities.PaymentDetail;
import com.sandipsky.inventory_system.features.accounting.payment.repositories.AmountDueInvoiceRepository;
import com.sandipsky.inventory_system.features.accounting.payment.repositories.MasterPaymentRepository;
import com.sandipsky.inventory_system.features.accounting.payment.repositories.PaymentDetailRepository;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sandipsky.inventory_system.common.exception.BadRequestException;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;
import com.sandipsky.inventory_system.common.util.MoneyUtil;

@Service
public class PaymentAdjustmentService {

    @Autowired
    private MasterPaymentRepository repository;

    @Autowired
    private PaymentDetailRepository paymentDetailRepository;

    @Autowired
    private AmountDueInvoiceRepository amountDueInvoiceRepository;

    @Autowired
    private PaymentService paymentService;

    // Payments (advances) whose amount has not been fully allocated to invoices yet, paged and
    // filtered like the payment list. Half a paisa absorbs floating-point leftovers.
    public Page<MasterPaymentDTO> getPaymentsWithUnadjustedAmount(Map<String, String> params) {
        return paymentService.findPage(params,
                (root, query, cb) -> cb.greaterThan(root.get("unadjustedAmount"), 0.005));
    }

    // Allocates part of a payment's unadjusted amount against due invoices
    @Transactional
    public MasterPayment adjustPayment(int paymentId, List<PaymentDetailDTO> details) {
        MasterPayment masterPayment = repository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment with Given Id not found"));

        if (details == null || details.isEmpty()) {
            throw new BadRequestException("No invoice adjustments were provided");
        }

        double adjusted = 0;
        for (PaymentDetailDTO item : details) {
            if (item.getPaidAmount() <= 0) {
                throw new BadRequestException("Paid amount for an invoice must be greater than zero");
            }
            adjusted += item.getPaidAmount();
        }

        if (MoneyUtil.exceeds(adjusted, masterPayment.getUnadjustedAmount())) {
            throw new BadRequestException("Adjusted amount cannot exceed the unadjusted amount of the payment");
        }

        for (PaymentDetailDTO item : details) {
            AmountDueInvoice dueInvoice = amountDueInvoiceRepository.findByInvoiceNumber(item.getInvoiceNumber())
                    .orElseThrow(() -> new ResourceNotFoundException("Due Invoice not found: " + item.getInvoiceNumber()));
            if (MoneyUtil.exceeds(item.getPaidAmount(), dueInvoice.getDueAmount())) {
                throw new BadRequestException("Paid amount exceeds due amount for invoice " + item.getInvoiceNumber());
            }
            dueInvoice.setPaidAmount(MoneyUtil.round2(dueInvoice.getPaidAmount() + item.getPaidAmount()));
            dueInvoice.setDueAmount(MoneyUtil.round2(dueInvoice.getDueAmount() - item.getPaidAmount()));
            amountDueInvoiceRepository.save(dueInvoice);

            PaymentDetail detail = new PaymentDetail();
            detail.setMasterPaymentId(masterPayment.getId());
            detail.setInvoiceDate(item.getInvoiceDate());
            detail.setInvoiceNumber(item.getInvoiceNumber());
            detail.setTotalInvoiceAmount(item.getTotalInvoiceAmount());
            detail.setDueAmount(dueInvoice.getDueAmount());
            detail.setPaidAmount(item.getPaidAmount());
            paymentDetailRepository.save(detail);
        }

        masterPayment.setTotalAdjustedPaidAmount(MoneyUtil.round2(masterPayment.getTotalAdjustedPaidAmount() + adjusted));
        masterPayment.setUnadjustedAmount(MoneyUtil.round2(masterPayment.getUnadjustedAmount() - adjusted));
        return repository.save(masterPayment);
    }
}
