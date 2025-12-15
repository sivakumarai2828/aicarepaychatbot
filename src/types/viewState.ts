export type ViewState =
    | 'welcome'
    | 'bills'
    | 'payment-plans'
    | 'payment-options'
    | 'account-lookup'
    | 'payment-form'
    | 'confirmation'
    | 'success';

export interface ViewStateData {
    state: ViewState;
    data?: any;
}
