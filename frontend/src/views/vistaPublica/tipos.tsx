


export interface ActivarVistaPublica{
    version:number
    box_size:number
    boder:number
    color_fill:string
    color_back:string
    texto:string
    ver_grafico:boolean
    verAcercaDeNosotros:boolean
}

export interface AcercaDeNosotros{
    id:number
    descripcion:string
}

export interface AcercaDeNosotrosConId extends AcercaDeNosotros{
    id:number
}

export interface AcercaDeNosotrosForm{
    descripcion:string |"";

}
/*
export interface IdentificadorUnico{
    id_alfanumerico:string
    estado:boolean
    urldelQR:string
}*/