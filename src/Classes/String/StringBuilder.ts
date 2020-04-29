export class StringBuilder {
    private _str: string;

    public constructor(str?: string) {
        if (typeof str === "undefined") {
            this._str = "";
        }
        else {
            this._str = str;
        }
    }

    /**
     * Returns the length of the `StringBuilder`.
     */
    public length(): number {
        return this._str.length;
    }

    /**
     * Appends something to the `StringBuilder`.
     * @param {string} content The content to append. 
     */
    public append(content: any): this {
        this._str += content;
        return this;
    }    

    /**
     * Appends a new line to the `StringBuilder`.
     */
    public appendLine(): this {
        this._str += "\n";
        return this;
    }

    /**
     * Builds the `StringBuilder` object.
     */
    public toString(): string {
        return this._str;
    }

    /**
     * Reverses the `StringBuilder` object.
     */
    public reverse(): this {
        let newStr: string = "";
        for (let i = this._str.length - 1; i >= 0; i--) {
            newStr += this._str[i];
        }
        this._str = newStr;
        return this;
    }

    /**
     * Deletes a portion of the `StringBuilder`.
     * @param {number} start The starting index, inclusive. 
     * @param {number} end The end index, exclusive. 
     */
    public delete(start: number, end: number): this {
        this._str = this._str.replace(this._str.substring(start, end), "");
        return this;
    }
}